var fs      = require('fs'),
    request = require('request');


var Antigate = function(key) {
  this.key = key;
};


Antigate.prototype.process = function(data, callback) {
  var self = this;

  self.upload(data, function(error, captchaId) {
    self.check(captchaId, function(error, captchaText) {
      if (error) {
        callback(error, null, null);
      } else {
        callback(null, captchaText, captchaId);
      }
    });
  });
};

Antigate.prototype.processFromFile = function(filename, callback) {
  var self = this;

  this.readCaptcha(filename, function(error, data) {
    if (error) {
      callback(error, null);
    } else {
      return self.process(data, callback);
    }
  });
};

Antigate.prototype.processFromURL = function(url, callback) {
  var self = this;

  this.loadCaptcha(url, function(error, data) {
    if (error) {
      callback(error, null);
    } else {
      return self.process(data, callback);
    }
  });
};

Antigate.prototype.report = function(id, callback) {
  var url = 'http://antigate.com/res.php?key='
            + this.key
            + '&action=reportbad&id='
            + id;
  request.get(url, function(error, response, body) {
    if (typeof callback !== 'function') {
      return;
    }

    if (error) {
      callback(error);
    } else {
      if (body.indexOf('OK') === 0) {
        callback(null);
      } else {
        callback(new Error(body));
      }
    }
  });
};

Antigate.prototype.upload = function(body, callback) {
  request.post('http://antigate.com/in.php', {
    form: {
      method: 'base64',
      key: this.key,
      body: body
    }
  }, function(error, response, body) {
    if (typeof callback !== 'function') return;

    if (body.indexOf('OK') === 0) {
      callback(null, body.split('|')[1]);
    } else {
      callback(new Error(body), null);
    }
  });
};

Antigate.prototype.check = function(id, callback) {
  var url = 'http://antigate.com/res.php?key='
            + this.key
            + '&action=get&id='
            + id;
  var self = this;

  request.get(url, function(error, response, body) {
    if (error) {
      callback(error, null);
    } else {
      if (body.indexOf('OK') === 0) {
        callback(null, body.split('|')[1]);
      } else {
        if (body === 'CAPCHA_NOT_READY') {
          setTimeout(function() {
            self.check(id, callback);
          }, 5000);
        } else {
          callback(new Error(error), null);
        }
      }
    }
  });
};

Antigate.prototype.getBalance = function(callback) {
  var url = 'http://antigate.com/res.php?key='
            + this.key
            + '&action=getbalance';
  request.get(url, function(error, response, body) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, parseFloat(body));
    }
  });
};

Antigate.prototype.readCaptcha = function(path, callback) {
  fs.readFile(path, function(error, data) {
    if (error) {
      callback(error, null);
    } else {
      callback(null, new Buffer(data).toString('base64'));
    }
  });
};

Antigate.prototype.loadCaptcha = function(url, callback) {
  return request.get(url, { encoding: null }, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      callback(null, body.toString('base64'));
    } else {
      callback(error, null);
    }
  });
};

module.exports = Antigate;
