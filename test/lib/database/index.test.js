
var path = require('path')
var assert = require('assert');;

describe('API database', function() {

  var db;
  var testEntryPrefix = 'unit_test_';
  var testId = Date.now();

  var queryDir = path.resolve(__dirname, 'queries');

  var config = {
    queryDirectory: queryDir,
    pgConnString: 'postgres://pg_js_test:pg_js_test@127.0.0.1/pg_js_test'
  };

  it('load the dependency', function() {
    db = require('../../../lib/database/')(config);
  });

  it('populate test data', function(done) {
    
    var arg1 = testEntryPrefix + testId;
    db.createFubar(arg1, "2", "3", function(err) {
      done(err);
    });
  });

  it('fetch', function(done) {
    var arg1 = testEntryPrefix + testId;
    db.testFunc(arg1, "2", "3", function(err, account) {
      assert.ok(!err, err ? err.stack : '');
      assert.ok(account);
      assert.equal(account.arg1, arg1);
      done();
    });
  });

  after(function(done) {
    var DB = require('../../../lib/database/ClientPool.js')(config);
    var qryStr = "DELETE FROM fubar WHERE arg1 LIKE '"+testEntryPrefix+"%'";
    
    DB.query(qryStr, [], function(err) {
      done(err);
    });
  });

});
