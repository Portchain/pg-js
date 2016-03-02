
var assert = require('assert');

describe('API database', function() {

  var db;
  var testEntryPrefix = 'unit_test_';
  var testId = Date.now();

  it('load the dependency', function() {
    db = require('../../../lib/database/');
  });

  it('populate test data', function(done) {
    
    var accountName = testEntryPrefix + testId;
    db.createAccount(accountName, function(err) {
      done(err);
    });
  });

  it('fetchAccount', function() {
    var accountName = testEntryPrefix + testId;
    db.fetchAccount(accountName, function(err, account) {
      assert.ok(!err, err ? err.stack : '');
      assert.ok(account);
      assert.equal(account.name, accountName);
      assert.ok(account.createdDate instanceof Date);
      assert.ok(account.createdDate.getTime() > (Date.now() - 2000));
    });
  });

  after(function(done) {
    var DB = require('../../../lib/database/ClientPool.js')();
    var qryStr = "DELETE FROM accounts WHERE name LIKE '"+testEntryPrefix+"'";
    
    DB.query(qryStr, [], function(err) {
      done(err);
    });
  });

});
