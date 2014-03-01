/*

GET /note
GET /note/:id
POST /note
PUT /note/:id
DELETE /note/:id

*/

// Could be cool if we could serve some api doc or even an api script
// user could do <script href="/note/api?token=1&user=2"></script> and be served
// a client-side javascript api?
// Eg.
// HTTP.api.note.create();
// HTTP.api.login(username, password);
// HTTP.api.logout


_publishHTTP = {};

// Cache the names of all http methods we've published
_publishHTTP.currentlyPublished = [];

var defaultAPIPrefix = '/api/';

/**
 * @method _publishHTTP.getPublishScope
 * @private
 * @param {Object} scope
 * @returns {httpPublishGetPublishScope.publishScope}
 * 
 * Creates a nice scope for the publish method
 */
_publishHTTP.getPublishScope = function httpPublishGetPublishScope(scope) {
  var publishScope = {};
  publishScope.userId = scope.userId;
  publishScope.params = scope.params;
  publishScope.query = scope.query;
  // TODO: Additional scoping
  // publishScope.added
  // publishScope.ready
  return publishScope;
};

_publishHTTP.formatHandlers = {};

/**
 * @method _publishHTTP.formatHandlers.json
 * @private
 * @param {Object} result - The result object
 * @returns {String} JSON
 * 
 * Formats the output into JSON and sets the appropriate content type on `this`
 */
_publishHTTP.formatHandlers.json = function httpPublishJSONFormatHandler(result) {
  // Set the method scope content type to json
  this.setContentType('application/json');
  // Return EJSON string
  return EJSON.stringify(result);
};

/**
 * @method _publishHTTP.formatResult
 * @private
 * @param {Object} result - The result object
 * @param {Object} scope
 * @returns {Any} The formatted result
 * 
 * Formats the result into the format selected by querystring eg. "&format=json"
 */
_publishHTTP.formatResult = function httpPublishFormatResult(result, scope) {

  // Get the format in lower case and default to json
  var format = (scope && scope.query && scope.query.format || 'json').toLowerCase();

  // Set the format handler found
  var formatHandlerFound = !!(typeof _publishHTTP.formatHandlers[format] === 'function');

  // Set the format handler and fallback to default json if handler not found
  var formatHandler = _publishHTTP.formatHandlers[(formatHandlerFound) ? format : 'json'];

  // Check if format handler is a function
  if (typeof formatHandler !== 'function') {
    // We break things the user could have overwritten the default json handler
    throw new Error('The default json format handler not found');
  }

  if (!formatHandlerFound) {
    scope.setStatusCode(500);
    return '{"error":"Format handler for: `' + format + '` not found"}';
  }

  // Execute the format handler
  try {
    return formatHandler.apply(scope, [result]);
  } catch(err) {
    scope.setStatusCode(500);
    return '{"error":"Format handler for: `' + format + '` Error: ' + err.message + '"}';
  }
};

/**
 * @method _publishHTTP.error
 * @private
 * @param {String} statusCode - The status code
 * @param {String} message - The message
 * @param {Object} scope
 * @returns {Any} The formatted result
 * 
 * Responds with error message in the expected format
 */
_publishHTTP.error = function httpPublishError(statusCode, message, scope) {
  var result = _publishHTTP.formatResult(message, scope);
  scope.setStatusCode(statusCode);
  return result;
};

/**
 * @method _publishHTTP.getMethodHandler
 * @private
 * @param {Meteor.Collection} collection - The Meteor.Collection instance
 * @param {String} methodName - The method name
 * @returns {Function} The server method
 * 
 * Returns the DDP connection handler, already setup and secured
 */
_publishHTTP.getMethodHandler = function httpPublishGetMethodHandler(collection, methodName) {
  if (collection instanceof Meteor.Collection) {
    if (collection._connection && collection._connection.method_handlers) {
      return collection._connection.method_handlers[collection._prefix + methodName];
    } else {
      throw new Error('HTTP publish does not work with current version of Meteor');
    }
  } else {
    throw new Error('_publishHTTP.getMethodHandler expected a collection');
  }
};

/**
 * @method _publishHTTP.unpublishList
 * @private
 * @param {Array} names - List of method names to unpublish
 * @returns {undefined}
 * 
 * Unpublishes all HTTP methods that have names matching the given list.
 */
_publishHTTP.unpublishList = function httpPublishUnpublishList(names) {
  if (!names.length) {
    return;
  }
  
  // Carry object for methods
  var methods = {};

  // Unpublish the rest points by setting them to false
  for (var i = 0, ln = names.length; i < ln; i++) {
    methods[names[i]] = false;
  }

  HTTP.methods(methods);
  
  // Remove the names from our list of currently published methods
  _publishHTTP.currentlyPublished = _.difference(_publishHTTP.currentlyPublished, names);
};

/**
 * @method _publishHTTP.unpublish
 * @private
 * @param {String|Meteor.Collection} [name] - The method name or collection
 * @param {Object} [options]
 * @param {Object} [options.apiPrefix='/api/'] - Prefix used when originally publishing the method, if passing a collection.
 * @returns {undefined}
 * 
 * Unpublishes all HTTP methods that were published with the given name or 
 * for the given collection. Call with no arguments to unpublish all.
 */
_publishHTTP.unpublish = function httpPublishUnpublish(/* name or collection, options */) {
  var options = arguments[1] || {};
  var apiPrefix = options.apiPrefix || defaultAPIPrefix;
  
  // Determine what method name we're unpublishing
  var name = (arguments[0] instanceof Meteor.Collection) ?
          apiPrefix + arguments[0]._name : arguments[0];
          
  // Unpublish name and name/id
  if (name && name.length) {
    _publishHTTP.unpublishList([name, name + '/:id']);
  } 
  
  // If no args, unpublish all
  else {
    _publishHTTP.unpublishList(_publishHTTP.currentlyPublished);
  }
  
};

/**
 * @method HTTP.publishFormats
 * @public
 * @param {Object} newHandlers
 * @returns {undefined}
 * 
 * Add publish formats. Example:
 ```js
 HTTP.publishFormats({

    json: function(inputObject) {
      // Set the method scope content type to json
      this.setContentType('application/json');
      // Return EJSON string
      return EJSON.stringify(inputObject);
    }

  });
 ```
 */
HTTP.publishFormats = function httpPublishFormats(newHandlers) {
  _.extend(_publishHTTP.formatHandlers, newHandlers);
};

/**
 * @method HTTP.publish
 * @public
 * @param {String|Meteor.Collection} item - Name or a Meteor.Collection instance
 * @param {Function} [func] - The publish function
 * @param {Object} [options]
 * @param {String} [options.apiPrefix='/api/'] - Prefix to use, e.g. '/rest/'
 * @returns {undefined}
 * @todo this should use options argument instead of optional args
 * 
 * Publish restpoint mounted on "name" with data (cursor) returned from func.
 * 
 * __Usage:__
 * 
 * Publish only:
 * 
 * HTTP.publish('mypublish', func);
 * 
 * Publish and mount crud rest point for collection /api/myCollection:
 * 
 * HTTP.publish(myCollection, func);
 * 
 * Mount CRUD rest point for collection and publish none /api/myCollection:
 * 
 * HTTP.publish(myCollection);
 * 
 */
HTTP.publish = function httpPublish(/* name, func or collection, func */) {

  // If not publish only then we are served a Meteor.Collection
  var collection = (arguments[0] instanceof Meteor.Collection)? arguments[0]: null;

  // Second parametre could be a function
  var func = (typeof arguments[1] === 'function')? arguments[1]: null;

  // Second or third parametre is optional options
  var options = (func) ? arguments[2] : arguments[1];
  options = options || {};
  
  // Determine API prefix
  var apiPrefix = options.apiPrefix || defaultAPIPrefix;

  // Rig the methods for the CRUD interface
  var methods = {};

  // Mounts collection on eg. /api/mycollection and /api/mycollection/:id
  // or a user specified name - HTTP.methods will throw error if name is invalid
  var name = (collection) ? apiPrefix + collection._name : arguments[0];

  // Make sure we are handed a Meteor.Collection
  if (!name) {
    throw new Error('HTTP.publish expected a collection or access point in first parametre');
  }

  // console.log('HTTP restpoint: ' + name);

  // list and create
  methods[name] = {};

  if (func) {
    // Return the published documents
    methods[name].get = function(data) {
      // Format the scope for the publish method
      var publishScope = _publishHTTP.getPublishScope(this);
      // Get the publish cursor
      var cursor = func.apply(publishScope, [data]);

      // Check if its a cursor
      if (cursor && cursor.fetch) {
        // Fetch the data fron cursor
        var result = cursor.fetch();
        // Return the data
        return _publishHTTP.formatResult(result, this);
      } else {
        // We didnt get any
        return _publishHTTP.error(200, [], this);
      }
    };
  }

  if (collection) {
    // If we have a collection then add insert method
    methods[name].post = function(data) {
      var insertMethodHandler = _publishHTTP.getMethodHandler(collection, 'insert');
      // Make sure that _id isset else create a Meteor id
      data._id = data._id || Random.id();
      // Create the document
      try {
        // We should be passed a document in data
        insertMethodHandler.apply(this, [data]);
        // Return the data
        return _publishHTTP.formatResult({ _id: data._id }, this);
      } catch(err) {
        // This would be a Meteor.error?
        return _publishHTTP.error(err.error, { error: err.message }, this);
      }
    };

    // We also add the findOne, update and remove methods
    methods[name + '/:id'] = {};
    
    if (func) {
      // We have to have a publish method inorder to publish id? The user could
      // just write a publish all if needed - better to make this explicit
      methods[name + '/:id'].get = function(data) {
        // Get the mongoId
        var mongoId = this.params.id;

        // We would allways expect a string but it could be empty
        if (mongoId !== '') {

          // Format the scope for the publish method
          var publishScope = _publishHTTP.getPublishScope(this);

          // Get the publish cursor
          var cursor = func.apply(publishScope, [data]);

          // Result will contain the document if found
          var result;

          // Check to see if document is in published cursor
          cursor.forEach(function(doc) {
            if (!result) {
              if (doc._id === mongoId) {
                result = doc;
              }
            }
          });

          // If the document is found the return
          if (result) {
            return _publishHTTP.formatResult(result, this);
          } else {
            // We do a check to see if the doc id exists
            var exists = collection.findOne({ _id: mongoId });
            // If it exists its not published to the user
            if (exists) {
              // Unauthorized
              return _publishHTTP.error(401, { error: 'Unauthorized' }, this);
            } else {
              // Not found
              return _publishHTTP.error(404, { error: 'Document with id ' + mongoId + ' not found' }, this);
            }
          }

        } else {
          return _publishHTTP.error(400, { error: 'Method expected a document id' }, this);
        }
      };
    }

    methods[name + '/:id'].put = function(data) {
      // Get the mongoId
      var mongoId = this.params.id;

      // We would allways expect a string but it could be empty
      if (mongoId !== '') {

        var updateMethodHandler = _publishHTTP.getMethodHandler(collection, 'update');
        // Create the document
        try {
          // We should be passed a document in data
          updateMethodHandler.apply(this, [{ _id: mongoId }, data]);
          // Return the data
          return _publishHTTP.formatResult({ _id: mongoId }, this);
        } catch(err) {
          // This would be a Meteor.error?
          return _publishHTTP.error(err.error, { error: err.message }, this);
        }
        
      } else {
        return _publishHTTP.error(400, { error: 'Method expected a document id' }, this);
      }      
    };

    methods[name + '/:id'].delete = function(data) {
       // Get the mongoId
      var mongoId = this.params.id;

      // We would allways expect a string but it could be empty
      if (mongoId !== '') {

        var removeMethodHandler = _publishHTTP.getMethodHandler(collection, 'remove');
        // Create the document
        try {
          // We should be passed a document in data
          removeMethodHandler.apply(this, [{ _id: mongoId }]);
          // Return the data
          return _publishHTTP.formatResult({ _id: mongoId }, this);
        } catch(err) {
          // This would be a Meteor.error?
          return _publishHTTP.error(err.error, { error: err.message }, this);
        }
        
      } else {
        return _publishHTTP.error(400, { error: 'Method expected a document id' }, this);
      }     
    };

  }

  // Publish the methods
  HTTP.methods(methods);
  
  // Mark these method names as currently published
  _publishHTTP.currentlyPublished = _.union(_publishHTTP.currentlyPublished, _.keys(methods));
  
}; // EO Publish

/**
 * @method HTTP.unpublish
 * @public
 * @param {String|Meteor.Collection} [name] - The method name or collection
 * @param {Object} [options]
 * @param {Object} [options.apiPrefix='/api/'] - Prefix used when originally publishing the method, if passing a collection.
 * @returns {undefined}
 * 
 * Unpublishes all HTTP methods that were published with the given name or 
 * for the given collection. Call with no arguments to unpublish all.
 */
HTTP.unpublish = _publishHTTP.unpublish;