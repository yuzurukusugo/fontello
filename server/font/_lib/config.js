// Converts fonts config from the client (sent when user clicks Download button)
// into a config suitable for the font builder.
//
// Client config structure:
//
//   name:
//   css_prefix_text:
//   css_use_suffix:
//   hinting:
//   glyphs:
//     - uid:
//       src: fontname
//       code: codepoint
//       css:
// 
// For custom icons
//
//       selected: flag
//       svg:
//         - path:
//           width:
//     - ...
//
// Resulting builder config:
//
//   font:
//     fontname:
//     fullname:
//     familyname:
//     copyright:
//     ascent:
//     descent:
//     weight:
//
//   meta:
//     columns:
//     css_prefix_text:
//     css_use_suffix:
//
//   glyphs:
//     - src:
//       from: codepoint
//       code: codepoint
//       css:
//       css-ext:
//
//     - ...
//
//   fonts_list:
//     -     
//      font:
//      meta:
//


'use strict';


var _ = require('lodash');


var fontConfigs = require('../../../lib/embedded_fonts/server_config');

function collectGlyphsInfo(input) {
  var result = [];

  _.forEach(input, function (inputGlyph) {

    if(inputGlyph.src === 'custom_icons') {

      // for custom glyphs use only selected ones      
      if (!inputGlyph.selected) { return; }

      result.push({
        src:       inputGlyph.src
      , uid:       inputGlyph.uid
      , code:      Number(inputGlyph.code)
      , css:       inputGlyph.css
      , width:     inputGlyph.svg.width
      , d:         inputGlyph.svg.path
      });
      return;
    }

    // For exmbedded fonts take pregenerated info

    var glyph = fontConfigs.uids[inputGlyph.uid];
    if (!glyph) { return; }

    result.push({
      src:       glyph.fontname
    , uid:       inputGlyph.uid
    , code:      Number(inputGlyph.code || glyph.code)
    , css:       inputGlyph.css || glyph.css
    , 'css-ext': glyph['css-ext']
    , width:     glyph.svg.width
    , d:         glyph.svg.d
    });

  });

  // Sort result by original codes.
  result.sort(function (a, b) { return a.from - b.from; });

  return result;
}

// collect fonts metadata required to build license info

function collectFontsInfo(glyphs) {
  var result = [];

  _(glyphs).pluck('src').unique().forEach(function (fontname) {
    var font = fontConfigs.fonts[fontname];
    var meta = fontConfigs.metas[fontname];

    if (font && meta) {
      result.push({ font : font, meta : meta });
    }

  });
  return result;
}


module.exports = function fontConfig(clientConfig) {

  var fontname, glyphsInfo, fontsInfo;

  if (!_.isObject(clientConfig)) {
    return null;
  }

  if (!_.isEmpty(clientConfig.name)) {
    fontname = String(clientConfig.name).replace(/[^a-z0-9\-_]+/g, '-');
  } else {
    fontname = 'fontello';
  }

  glyphsInfo = collectGlyphsInfo(clientConfig.glyphs);
  fontsInfo  = collectFontsInfo(glyphsInfo);

  if (_.isEmpty(glyphsInfo)) {
    return null;
  }

  return {
    font: {
      fontname:   fontname
    , fullname:   fontname
      // !!! IMPORTANT for IE6-8 !!!
      // due bug, EOT requires `familyname` begins `fullname`
      // https://github.com/fontello/fontello/issues/73?source=cc#issuecomment-7791793
    , familyname: fontname
    , copyright:  'Copyright (C) 2012 by original authors @ fontello.com'
    , ascent:     850
    , descent:    -150
    , weight:     400
    }
  , hinting : clientConfig.hinting !== false
  , meta: {
      columns: 4 // Used by the demo page.
      // Set defaults if fields not exists in config
    , css_prefix_text: clientConfig.css_prefix_text || 'icon-'
    , css_use_suffix:  Boolean(clientConfig.css_use_suffix)
    }
  , glyphs:     glyphsInfo
  , fonts_list: fontsInfo
  };
};
