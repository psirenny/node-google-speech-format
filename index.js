var _ = require('lodash')
  , exec = require('child_process').exec
  , fs = require('fs')
  , temp = require('temp')
  , util = require('util');

module.exports = function (options, callback) {
  var file = temp.path();

  if (typeof options === 'string') {
    options = {file: options};
  }

  _.merge(options, {
    clipSize: 15,
    sampleRate: 16000
  });

  // normalize audio
  var cmd = 'sox "%s" -r %d "%s.flac" gain -n -5 silence 1 5 2%%';
  cmd = util.format(cmd, options.file, options.sampleRate, file);

  exec(cmd, function (err) {
    if (err) callback(err);
    if (!options.clipSize) return callback(null, [file + '.flac']);

    // get audio duration
    cmd = util.format('sox --i -D "%s.flac"', file);

    exec(cmd, function (err, duration) {
      if (err) return callback(err);

      // split into sound clips
      cmd = 'sox "%s.flac" "%s%%1n.flac" trim 0 %d : newfile : restart';
      cmd = util.format(cmd, file, file, options.clipSize);

      exec(cmd, function (err) {
        fs.unlink(file + '.flac');
        if (err) return callback(err);

        var count = Math.ceil(duration / options.clipSize)
          , name = function (i) { return file + i + '.flac'; }
          , files = _.range(1, count + 1).map(name);

        callback(null, files);
      });
    });
  });
};