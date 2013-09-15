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

var apiPrefix = '/api/';

// Create a nice scope for the publish method
_publishHTTP.getPublishScope = function(scope) {
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

// Format the output into json
_publishHTTP.formatHandlers.json = function(result) {
  // Set the method scope content type to json
  this.setContentType('application/json');
  // Return EJSON string
  return EJSON.stringify(result);
};

// Format the result into the format selected by querystring eg. "&format=json"
_publishHTTP.formatResult = function(result, scope) {

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
    return '{"error":"Format handler for: `' + format + '` Error: ' + err.message + '"}'
  }
};

// Respond with error message in the expected format
_publishHTTP.error = function(statusCode, message, scope) {
  var result = _publishHTTP.formatResult(message, scope);
  scope.setStatusCode(statusCode);
  return result;
};

// Set format handlers
/*
  HTTP.publishFormats({

    json: function(inputObject) {
      // Set the method scope content type to json
      this.setContentType('application/json');
      // Return EJSON string
      return EJSON.stringify(inputObject);
    }

  });
*/
HTTP.publishFormats = function(newHandlers) {
  _.extend(_publishHTTP.formatHandlers, newHandlers);
};

// Publish restpoint mounted on "name" with data from func (cursor)
HTTP.publish = function(/* name, func or collection, func */) {
  // Usage:
  // Publish only
  // HTTP.publish('mypublish', func);
  // String Function [Object]

  // Publish and mount crud rest point for collection /api/myCollection
  // HTTP.publish(myCollection, func);
  // Meteor.Collection Function [Object]

  // Mount crud rest point for collection and publish none /api/myCollection
  // HTTP.publish(myCollection);
  // Meteor.Collection [Object]

  // If not publish only then we are served a Meteor.Collection
  var collection = (arguments[0] instanceof Meteor.Collection)? arguments[0]: null;

  // Second parametre could be a function
  var func = (typeof arguments[1] === 'function')? arguments[1]: null;

  // Second or third parametre is optional options
  var options = (func)? arguments[2] : arguments[1];

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

  // We use the ddp connection handlers allready setup and secured
  function getMethodHandler(methodName) {
    if (collection._connection && collection._connection.method_handlers) {
      return collection._connection.method_handlers[collection._prefix + methodName];
    } else {
      throw new Error('HTTP publish does not work with current version of Meteor');
    }
  }

  // list and create
  methods[name] = function(data) {
    // Return the published documents
    if (this.method === 'GET' && func) {
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
    } // EO GET

    // Create new document
    if (this.method === 'POST' && collection) {
      var insertMethodHandler = getMethodHandler('insert');
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
    }
  };

  if (collection) {
    // get, update and remove
    methods[name + '/:id'] = function(data) {
      // Get the mongoId
      var mongoId = this.params.id;

      // We would allways expect a string but it could be empty
      if (mongoId !== '') {

        // return the single document
        if (this.method === 'GET' && func) {

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
        } // EO GET


        // update the document
        if (this.method === 'PUT') {
          var updateMethodHandler = getMethodHandler('update');
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
        } // EO PUT


        // delete the document
        if (this.method === 'DELETE') {
          var removeMethodHandler = getMethodHandler('remove');
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
        } // EO DELETE


      } else {
        return _publishHTTP.error(400, { error: 'Method expected a document id' }, this);
      }
    };
  } // EO not publish only


  HTTP.methods(methods);
}; // EO Publish


// The collection can be unpublished from HTTP
HTTP.unpublish = function(/* name or collection */) {
  // set collection if found
  // Mounts collection on eg. /api/mycollection and /api/mycollection/:id
  // or at name
  var name = (arguments[0] instanceof Meteor.Collection)?
          apiPrefix + arguments[0]._name: arguments[0];

  // Carry object for methods
  var methods = {};

  // Unpublish the rest points by setting them to false
  methods[name] = false;
  methods[name + '/:id'] = false;

  HTTP.methods(methods);
};
