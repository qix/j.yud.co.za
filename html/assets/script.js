$(function() {
  var adjustPhotos = function() {
    var images = Math.floor($(window).width() / 320);
    var width = Math.floor($(window).width() / images);
    var height = (213 / 320) * width;
    $(img).width(width);
    $(img).height(height);
  };
  $(window).resize(adjustPhotos);
  adjustPhotos();

  var tagged = {};
  var tagging = false;
  var writeTags = function() {
    $('.photo-browser-tags textarea')[0].textContent = Object.keys(tagged).join('\n') + '\n';
  };
  $('.photo-browser-tags button').on('click', function(el) {
    tagging = !tagging;
    $(el).closest('.photo-browser').toggleClass('photo-browser-tagging', tagging);
  });
  $('img').live('click', function(img) {
    if (!tagging) {
      return;
    }
    var photo = event.currentTarget.attributes['x-base'].value;
    var $thumbnail = $(img).closest('.photo-browser-thumbnail');
    tagged[photo] = !!tagged[photo];
    $thumbnail.toggleClass('photo-browser-tagged', tagged[photo]);
    writeTags();
    return false;
  });
});
