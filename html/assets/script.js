$(function() {
  var _width = null;
  var $browser = $('.photo-browser');

  if ($browser.length) {
    var adjustPhotos = function() {
      var images = Math.floor($(window).width() / 320);
      var width = Math.floor($(window).width() / images);
      if (_width === width) {
        return;
      }
      _width = width;
      var height = (213 / 320) * width;
      $('img').width(width);
      $('img').height(height);
    };
    setInterval(adjustPhotos, 1000);
    $(window).resize(adjustPhotos);
    adjustPhotos();

    var tagged = {};
    var tagging = false;
    var $tags = $('.photo-browser-tags textarea');
    var writeTags = function() {
      var tags = $('.photo-browser-tagged img').get().map(function(img) {
        return img.attributes['x-base'].value;
      });
      $tags.text(tags.join('\n') + '\n');
    };
    $tags.focus(function() {
      $(this).select();
      $(this).mouseup(function() {
        $(this).unbind('mouseup');
        return false;
      }.bind(this));
    });
    $('.photo-browser-tags button').on('click', function(el) {
      tagging = !tagging;
      $browser.toggleClass('photo-browser-tagging', tagging);
    });

    var lastIndex = null;

    $browser.on('click', 'img', function(event) {
      if (!tagging) {
        return;
      }

      var $photo = $(this);
      var $thumbnail = $photo.closest('.photo-browser-thumbnail');
      var tagged = !$thumbnail.hasClass('photo-browser-tagged');

      $thumbnail.toggleClass('photo-browser-tagged', tagged);

      var index = $thumbnail.index();
      if (event.shiftKey && lastIndex !== null) {
        var low = Math.min(index, lastIndex);
        var high = Math.max(index, lastIndex);
        var $thumbnails = $(
          '.photo-browser-thumbnail:eq(' + low + '),' +
          '.photo-browser-thumbnail:gt(' + low + '):lt(' + high + '),' +
          '.photo-browser-thumbnail:eq(' + high + ')'
        );
        $thumbnails.toggleClass('photo-browser-tagged', tagged);
      }

      lastIndex = index;
      writeTags();
      return false;
    });
  }
});
