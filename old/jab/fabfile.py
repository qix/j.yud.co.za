from __future__ import absolute_import

import os
from fabric.api import (
  local,
  task,
)

from util import (
  status,
)

HTML = '/home/josh/code/j.yud.co.za/html'

TAGS = '/home/josh/photo/tags'

PHOTO_HIRES = '/media/internal/photo-high'
PHOTO_LORES = '/home/josh/photo/low'
PHOTO_THUMB = '/home/josh/photo/thumbnail'
PHOTO_BROWSE = '/home/josh/photo/www'

S3_LORES = 'http://j-lores.s3-website-us-east-1.amazonaws.com'
S3_HIRES = 'http://j-hires.s3-website-us-east-1.amazonaws.com'
S3_THUMB = 'http://j-thumb.s3-website-us-east-1.amazonaws.com'
S3_WWW = 'http://j.yud.co.za.s3-website-us-east-1.amazonaws.com'
S3_BROWSE = '/photo'

BUCKET_THUMB = 'j-thumb'
BUCKET_LORES = 'j-lores'
BUCKET_HIRES = 'j-hires'
BUCKET_BROWSE = 'j.yud.co.za/photo'

RESTRICT = ''

def load_tags(filename):
  tags = set()
  with open('%s/%s' % (TAGS, filename)) as input:
    tags.update([photo.strip() for photo in input.read().split('\n')])
  return tags

def _join(parts):
  return '/'.join(filter(lambda x: x, parts))

def photo_page(index_path, paths, browse_base, include, exclude, back=None):
  input = PHOTO_HIRES
  output = PHOTO_BROWSE
  template = '''<html>
  <head>
    <link rel="stylesheet" type="text/css" href="%(www)s/assets/stylesheet.css" charset="utf-8" />
    <script type="text/javascript" src="http://code.jquery.com/jquery-2.1.4.min.js"></script>
    <script type="text/javascript" src="%(www)s/assets/script.js"></script>
  </head>
  <body class="photo-browser">
    <ul class="photo-browser-directories">
      %(links)s
    </ul>
    <div class="photo-browser-tags">
      <textarea></textarea>
      <button type="button">tag</button>
    </div>
    <div class="photo-browser-photos">
      %(photos)s
    </div>
  </body>
  </html>
  '''

  links = []
  photos = []

  total = 0
  for path in sorted(paths):
    assert path.startswith(input)
    base_path = path[len(input) + 1:]

    if base_path in exclude:
      continue

    if os.path.isdir(path):
      links.append('<a href="%s">%s</a>' % (
        _join([S3_BROWSE, browse_base, base_path]),
        os.path.basename(path)
      ))
    elif path.endswith('.jpg') and (include is None or base_path in include):
      photos.append(
        '<div class="photo-browser-thumbnail">' +
        '<a href="%s/%s"><img x-base="%s" src="%s/%s"></a>'
        '</div>' % (
        S3_LORES, base_path, base_path, S3_THUMB, base_path,
      ))

  output_path = _join([output, browse_base, index_path])

  if not os.path.isdir(os.path.dirname(output_path)):
    os.makedirs(os.path.dirname(output_path))

  if photos or links:
    empty = False
  else:
    empty = True

  print 'Writing index for', output_path, len(photos), len(links)

  if index_path != '':
    links.insert(0, '<a href="..">Up one folder</a>')

  #if back:
  #  links.insert(0, '<a href="%s">Up one folder</a>' % (
  #    _join([S3_BROWSE, browse_base, base_path]),
  #  ))

  with open(output_path, 'w') as f:
    f.write(template % {
      'www': S3_WWW,
      'links': '\n'.join(['<li class="photo-browser-directory">%s</li>' % link for link in links]),
      'photos': '\n'.join(photos),
    })

  return not empty

@task
def photo_index(base='', browse_base='', include=None, exclude=set()):
  input = PHOTO_HIRES
  folder = os.path.join(input, base)
  paths = []

  for filename in sorted(os.listdir(folder)):
    path = os.path.join(folder, filename)

    if os.path.isdir(path):
      result = photo_index(
        base=_join([base, filename]),
        browse_base=browse_base,
        include=include,
        exclude=exclude,
      )
      print path, result
      if not result:
        continue
    paths.append(path)

  all_photos = []
  for root, dirnames, filenames in os.walk(folder):
    all_photos.extend([os.path.join(root, filename) for filename in filenames])

  photo_page(
    index_path=_join([base, 'all.htm']),
    paths=all_photos,
    browse_base=browse_base,
    include=include,
    exclude=exclude,
  )

  return photo_page(
    index_path=_join([base, 'index.htm']),
    paths=paths,
    browse_base=browse_base,
    include=include,
    exclude=exclude,
  )

@task
def s3_sync():
  status('Sync files to S3')
  local('s3cmd --acl-public sync %s/%s s3://%s/%s' % (PHOTO_THUMB, '', BUCKET_THUMB, ''))
  local('s3cmd --acl-public sync %s/ s3://%s/' % (PHOTO_BROWSE, BUCKET_BROWSE))
  local('s3cmd --acl-public sync %s/%s s3://%s/%s' % (PHOTO_LORES, RESTRICT, BUCKET_LORES, RESTRICT))
  local('s3cmd --acl-public sync %s/%s s3://%s/%s' % (PHOTO_HIRES, RESTRICT, BUCKET_HIRES, RESTRICT))

@task
def photo():
  # Rather cruddy force lowercase
  for root, dirnames, filenames in os.walk(PHOTO_HIRES):
    for filename in filenames:
      path = os.path.join(root, filename)
      if path != path.lower():
        if os.path.exists(path.lower()) and os.stat(path.lower()).st_size > 0:
          assert open(path.lower(), 'rb').read() == open(path, 'rb').read(), 'match %s=>%s' % (path, path.lower())
        print 'Rename', path, path.lower()
        os.rename(path, path.lower())

  hires_list = []
  jpg = set()
  for root, dirnames, filenames in os.walk(PHOTO_HIRES):
    for filename in filenames:
      hires = os.path.join(root, filename)
      assert hires.startswith(PHOTO_HIRES)
      assert hires.lower() == hires
      hires_list.append(hires)

      if hires.endswith('.jpg'):
        jpg.add(hires)

  for hires in hires_list:
    thumb = hires.replace(PHOTO_HIRES, PHOTO_THUMB)
    lores = hires.replace(PHOTO_HIRES, PHOTO_LORES)
    assert thumb != hires
    assert lores != hires

    for output in [thumb, lores]:
      if not os.path.isdir(os.path.dirname(output)):
        os.makedirs(os.path.dirname(output))

    if hires.endswith('.jpg'):
      status('Processing: %s' % hires)
      for path, conversion in [
        (lores, '-quality 75 -resize "2560x1600"'),
        (thumb, '-quality 60 -resize "320x213" -gravity "center" -background "black" -extent "320x213"'),
      ]:
        if os.path.exists(path) and os.stat(path).st_size > 0:
          print path, 'already exists. Skipping.'
        else:
          local('convert %s %s %s' % (conversion, hires, path))
    elif hires.endswith('.arw') and hires.replace('.arw', '.jpg') in jpg:
      print 'Skipping raw:', hires
    else:
      print 'Skipping:', hires

  status('Write photo browser index files')

  exclude = set()
  exclude_tags = ('delete', 'private')
  for tag in exclude_tags:
    exclude.update(load_tags(tag))

  photo_index(
    include=set(),
    exclude=exclude,
  )

  for filename in os.listdir(TAGS):
    if filename not in exclude_tags and not filename.startswith('.'):
      photo_index(
        browse_base=filename,
        include=load_tags(filename),
        exclude=exclude,
      )
  photo_index(
    browse_base='all',
    exclude=exclude,
  )

  s3_sync()

@task
def upload():
  local('s3cmd --guess-mime-type sync %s/ s3://j.yud.co.za/' % (HTML))
