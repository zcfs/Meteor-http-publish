function equals(a, b) {
  return !!(EJSON.stringify(a) === EJSON.stringify(b));
}

list = new Meteor.Collection('list');
console.log('Client url: ' + Meteor.absoluteUrl());

Tinytest.add('HTTP - publish - client - test environment', function(test) {
  test.isTrue(typeof _publishHTTP === 'undefined', 'test environment initialized _publishHTTP');
  test.isTrue(typeof HTTP !== 'undefined', 'test environment not initialized HTTP');
  test.isTrue(typeof HTTP.publish !== 'undefined', 'test environment not initialized HTTP.publish');
  test.isTrue(typeof HTTP.unpublish !== 'undefined', 'test environment not initialized HTTP.unpublish');
  test.isTrue(typeof HTTP.publishFormats !== 'undefined', 'test environment not initialized HTTP.publishFormats');
});


Tinytest.add('HTTP - publish - client - wait for server', function(test) {
  test.isTrue(true);
  for (var i = 0; i < 5; i++) {
    for (var a = 0; a < 999999999; a++) {
      /* NOOP */
      var c = i*a;
    }    
  }
  test.isTrue(true);
});


id = '';
removedId = '';

Tinytest.addAsync('HTTP - publish - client - get list', function (test, onComplete) {

  HTTP.get('/api/list', function(err, result) {
    // Test the length of array result
    var len = result.data && result.data.length;
    test.isTrue(!!len, 'Result was empty');
    // Get the object
    var obj = result.data && result.data[0] || {};
    test.equal(obj.text, 'OK', 'Didnt get the expected result');
    // Set the id for the next test
    id = obj._id;
    onComplete();
  });

});

Tinytest.addAsync('HTTP - publish - client - put list', function (test, onComplete) {

  test.isTrue(id !== '', 'No id is set?');

  // Update the data
  HTTP.put('/api/list/' + id, {
    data: {
      $set: { text: 'UPDATED' }
    }
  }, function(err, result) {
    var resultId = result.data && result.data._id;
    test.isTrue(resultId !== undefined, 'Didnt get the expected id in result');

    // Check if data is updated
    HTTP.get('/api/list', function(err, result) {
      var len = result.data && result.data.length;
      test.isTrue(!!len, 'Result was empty');
      var obj = result.data && result.data[0] || {};
      test.equal(obj.text, 'UPDATED', 'Didnt get the expected result');
      onComplete();
    });
  });

});


Tinytest.addAsync('HTTP - publish - client - insert/remove list', function (test, onComplete) {

  // Insert a doc
  HTTP.post('/api/list', {
    data: {
      text: 'INSERTED'
    }
  }, function(err, result) {
    var resultId = result.data && result.data._id;
    test.isTrue(resultId !== undefined, 'Didnt get the expected id in result');
    // Delete the doc
    HTTP.del('/api/list/' + resultId, function(err, result) {
      removedId = result.data && result.data._id;
      test.isTrue(removedId !== undefined, 'Didnt get the expected id in result');
      onComplete();
    });
  });

});

Tinytest.addAsync('HTTP - publish - client - check removed', function (test, onComplete) {

  test.isTrue(removedId !== '', 'No removedId is set?');

  HTTP.get('/api/list/' + removedId, function(err, result) {
    var obj = result.data || {};
    test.isTrue(obj._id === undefined, 'Item was not removed');
    test.isTrue(err.response.statusCode === 404, 'Item was not removed');
    onComplete();
  });

});


Tinytest.addAsync('HTTP - publish - client - check findOne', function (test, onComplete) {

  test.isTrue(id !== '', 'No id is set?');

  HTTP.get('/api/list/' + id, function(err, result) {
    var obj = result.data || {};
    test.isTrue(obj._id !== undefined, 'expected a document');
    test.isTrue(obj.text === 'UPDATED', 'expected text === UPDATED');

    onComplete();
  });

});


      // Check if removedId found

      // Check if id still found


//Test API:
//test.isFalse(v, msg)
//test.isTrue(v, msg)
//test.equalactual, expected, message, not
//test.length(obj, len)
//test.include(s, v)
//test.isNaN(v, msg)
//test.isUndefined(v, msg)
//test.isNotNull
//test.isNull
//test.throws(func)
//test.instanceOf(obj, klass)
//test.notEqual(actual, expected, message)
//test.runId()
//test.exception(exception)
//test.expect_fail()
//test.ok(doc)
//test.fail(doc)
//test.equal(a, b, msg)
