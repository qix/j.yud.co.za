var update;

$(function() {
  var editor = document.getElementById('editor');
  var $editor = $(editor);
    
  var prev = "";

  // Wrap some text in markdown span
  var md = function(text, tag) {
    tag = tag || "span";
    return '<'+tag+' class="markdown">'+text+'</'+tag+'>';
  }

  update = function() {
    var text = "";

    var scan = function(el) {
      _.each(el.contents(), function(child) {
        if (child instanceof Text) {
          console.log(child, child.textContent);
          text += child.textContent;
        }else if (child.tagName == "BR") {
          console.log("<BR>");
          text += "\n";
        }else{
          scan($(child));
          if (child.tagName == "H1" || child.tagName == "DIV") {
            console.log(child.tagName);
            text += "\n";
          }
        }
      });
    };


    // Scan text ourselves (more predictable than innerText)
    scan($editor);

    text = text.replace(/X/, '');


    var html = _.escape(text);

    html = html.replace(/(\*{1,3})([^*]+)\1/g, function(match, stars, text) {
      if (stars.length == 3) {
        return md(stars) + '<strong><em>' + text + '</strong></em>' + md(stars);
      }else{
        var tag = stars.length == 1 ? 'em' : 'strong';
        return md(stars) + '<'+tag+'>' + text + '</'+tag+'>' + md(stars);
      }
    });

    html = html.replace(/(\n|^)(.*)( *\n[ \n]*)( *={3,} *)(\n|$)/, function(match, start, heading, blanks, underline, end) {
      var output = start;
      output += "<h1>"+heading+"</h1>";
      output += md(underline, 'div');

      return output;
    });

    html = html.replace(/\n/g, "<br/>");
    console.log(html);

    if (html != prev) {
      console.log("text ["+text+"] / html ["+html+"]");
      /*var selection = window.getSelection();

      for (var i = 0; i < selection.selCount; i++) {
        var range = selection.getRangeAt(i);

        if ($editor.has(range.startContainer)) {
          console.log(range.startOffset);
        }
      }*/

      var selectIndex = 0;
      for (var i = 0; i < Math.min(prev.length, html.length); i++) {
        if (html.charAt(html.length - i) != prev.charAt(prev.length - i)) {
          selectIndex = html.length - i + 1;
          break;
        }
      }

      console.log(selectIndex, prev.length, html.length);
      if (selectIndex == 0 && prev.length < html.length) {
        selectIndex = html.length - prev.length;
      }

      // Scan selectIndex right, make sure its not inside a tag
      for (var i = selectIndex; i < html.length; i++) {
        if (html.charAt(i) == '>') {
          selectIndex = i+1;
        }else if (html.charAt(i) == '<') {
          break;
        }
      }

      prev = html;

      html = html.substring(0, selectIndex) + '<span class="cursor"></span>' + html.substring(selectIndex);

      $editor.html(html);

      rangy.getSelection().collapse($('#editor .cursor')[0], 0);
    }
  };


  $editor.keyup(update);

});

