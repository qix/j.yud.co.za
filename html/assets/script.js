$(function() {
  $('.photo-browser-tags button').on('click', function() {
    $('img').on('click', function(img) {
      var photo = event.currentTarget.attributes['x-base'].value;
      $('.photo-browser-tags textarea')[0].textContent += photo + '\n';
      return false;
    });
  });
});
