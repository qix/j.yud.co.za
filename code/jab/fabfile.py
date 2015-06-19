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

TAGS = '/home/josh/code/j.yud.co.za/code/jab/tags'

PHOTO_HIRES = '/media/internal/photo-high'
PHOTO_LORES = '/home/josh/photo/low'
PHOTO_THUMB = '/home/josh/photo/thumbnail'
PHOTO_BROWSE = '/home/josh/photo/www'

S3_LORES = 'http://j-lores.s3-website-us-east-1.amazonaws.com'
S3_HIRES = 'http://j-hires.s3-website-us-east-1.amazonaws.com'
S3_THUMB = 'http://j-thumb.s3-website-us-east-1.amazonaws.com'
S3_WWW = 'http://j-www.s3-website-us-east-1.amazonaws.com'
S3_BROWSE = 'http://j-www.s3-website-us-east-1.amazonaws.com/photo'

BUCKET_THUMB = 'j-thumb'
BUCKET_LORES = 'j-lores'
BUCKET_BROWSE = 'j-www/photo'

#RESTRICT = ''
RESTRICT = 'shotwell/'

def load_tags(filename):
  tags = set()
  with open('%s/%s' % (TAGS, filename)) as input:
    tags.update([photo.strip() for photo in input.read().split('\n')])
  return tags

def _join(parts):
  return '/'.join(filter(lambda x: x, parts))

tag_delete = load_tags('delete')
tag_good = load_tags('good')

@task
def photo_index(input, output, base='', browse_base='', include=None, exclude=set()):
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
  folder = os.path.join(input, base)
  for filename in sorted(os.listdir(folder)):
    path = os.path.join(folder, filename)
    base_path = os.path.join(base, filename)

    if base_path in exclude:
      continue

    if os.path.isdir(path):
      result = photo_index(
        input=input,
        output=output,
        base=base_path,
        browse_base=browse_base,
        include=include,
        exclude=exclude,
      )
      if result:
        links.append('<a href="%s">%s</a>' % (
          _join([S3_BROWSE, browse_base, base_path]),
          filename
        ))

    if filename.endswith('.jpg') and (include is None or base_path in include):
      photos.append(
        '<div class="photo-browser-thumbnail">' +
        '<a href="%s/%s"><img x-base="%s" src="%s/%s"></a>'
        '</div>' % (
        S3_LORES, base_path, base_path, S3_THUMB, base_path,
      ))

  output_folder = _join([output, browse_base, base])

  if not os.path.isdir(output_folder):
    os.makedirs(output_folder)

  if photos or links:
    empty = False
  else:
    empty = True

  if base != '':
    links.insert(0, '<a href="..">Up one folder</a>')

  print 'Writing index for', output_folder
  with open(os.path.join(output_folder, 'index.htm'), 'w') as f:
    f.write(template % {
      'www': S3_WWW,
      'links': '\n'.join(['<li class="photo-browser-directory">%s</li>' % link for link in links]),
      'photos': '\n'.join(photos),
    })

  return not empty

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
        (thumb, '-quality 60 -resize "320x213"'),
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
  photo_index(
    PHOTO_THUMB,
    PHOTO_BROWSE,
    include=set(),
    exclude=tag_delete,
  )
  photo_index(
    PHOTO_THUMB,
    PHOTO_BROWSE,
    browse_base='good',
    include=tag_good,
    exclude=tag_delete,
  )

  status('Sync files to S3')
  local('s3cmd --acl-public sync %s/%s s3://%s/%s' % (PHOTO_THUMB, '', BUCKET_THUMB, ''))
  local('s3cmd --acl-public sync %s/%s s3://%s/%s' % (PHOTO_LORES, RESTRICT, BUCKET_LORES, RESTRICT))
  local('s3cmd --acl-public sync %s/ s3://%s/' % (PHOTO_BROWSE, BUCKET_BROWSE))

@task
def upload():
  local('s3cmd sync %s/ s3://j-www/' % (HTML))
