function equals(a, b) {
  return !!(EJSON.stringify(a) === EJSON.stringify(b));
}

Tinytest.add('HTTP - methods - test environment', function(test) {
  test.isTrue(typeof _publishHTTP !== 'undefined', 'test environment not initialized _publishHTTP');
  test.isTrue(typeof HTTP !== 'undefined', 'test environment not initialized HTTP');
  test.isTrue(typeof HTTP.publish !== 'undefined', 'test environment not initialized HTTP.publish');
  test.isTrue(typeof HTTP.unpublish !== 'undefined', 'test environment not initialized HTTP.unpublish');
  test.isTrue(typeof HTTP.publishFormats !== 'undefined', 'test environment not initialized HTTP.publishFormats');

});

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
