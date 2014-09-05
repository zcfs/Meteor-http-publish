Package.describe({
  name: 'cfs:http-publish',
  version: '0.0.0',
  summary: 'Adds HTTP.publish and HTTP.unpublish RESTful'
});

Package.on_use(function(api) {
  api.versionsFrom('METEOR@0.9.1');

  api.use(['webapp', 'underscore', 'ejson', 'random'], 'server');

  api.use('cfs:http-methods@0.0.24');

  api.imply && api.imply('cfs:http-methods');

  api.export && api.export('_publishHTTP', { testOnly: true });

  api.add_files('http.publish.client.api.js', 'client');
  api.add_files('http.publish.server.api.js', 'server');

});

Package.on_test(function (api) {
  api.use('cfs:http-publish', ['client', 'server']);
  api.use('test-helpers', ['client', 'server']);
  api.use('http', 'client');

  api.use(['tinytest', 'underscore', 'ejson', 'ordered-dict',
           'random', 'deps']);

  api.add_files('http.publish.tests.server.js', 'server');
  api.add_files('http.publish.tests.client.js', 'client');
});
