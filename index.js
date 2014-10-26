var _ = require('lodash');
var exec = require('child_process').exec;
var fs = require('fs');
var temp = require('temp');
var util = require('util');

module.exports = function (options, callback) {
  var file = temp.path();
  var tempfile = null;

  if (typeof options === 'string') {
    options = {file: options};
  }

  _.defaults(options, {
    clipSize: 15,
    sampleRate: 16000
  });

  if (Buffer.isBuffer(options.file)) {
    var buf = options.file;
    var suffix = '.' + options.filetype;
    tempfile = temp.openSync({suffix: suffix});
    fs.writeSync(tempfile.fd, buf, 0, buf.length);
    options.file = tempfile.path;
  }

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
        if (tempfile) fs.unlink(tempfile.path);
        if (err) return callback(err);

        var count = Math.ceil(duration / options.clipSize);
        var name = function (i) { return file + i + '.flac'; };
        var files = _.range(1, count + 1).map(name);

        callback(null, files);
      });
    });
  });
};
