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
      $tags.text(Object.keys(tagged).join('\n') + '\n');
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
    $browser.on('click', 'img', function(event) {
      if (!tagging) {
        return;
      }

      var $photo = $(this);
      var $thumbnail = $photo.closest('.photo-browser-thumbnail');
      var photo = event.currentTarget.attributes['x-base'].value;
      tagged[photo] = !tagged[photo];
      $thumbnail.toggleClass('photo-browser-tagged', tagged[photo]);
      writeTags();
      return false;
    });
  }
});
