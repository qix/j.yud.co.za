from __future__ import absolute_import

import fabric.colors

def _text(color, text, bold=False, ansi=True):
  if ansi:
    text = getattr(fabric.colors, color)(text, bold)
  return text

blue = lambda *arg, **kw: _text('blue', *arg, **kw)
cyan = lambda *arg, **kw: _text('cyan', *arg, **kw)
green = lambda *arg, **kw: _text('green', *arg, **kw)
magenta = lambda *arg, **kw: _text('magenta', *arg, **kw)
red = lambda *arg, **kw: _text('red', *arg, **kw)
white = lambda *arg, **kw: _text('white', *arg, **kw)
yellow = lambda *arg, **kw: _text('yellow', *arg, **kw)
