
define(function () {

	// NOTE: The way this module is constructed is the recommended approach to structuring tools
	//		 that leverage DeveloperCompanion at the lowest level.

	return {
		init: function(devcomp, options) {

			// NOTE: node-webkit provides access to browser and nodejs environments in the same runtime.
			//	     See: https://github.com/rogerwang/node-webkit/wiki/Transfer-objects-between-window-and-node
			//		 Even though this is convenient you should structure your code so it uses one or the other
			//		 to allow splitting app into a server and client components that may run in a standard browser.
			//       Future tool abstractions will extensively address how to write tools in a portable fashion.

			// Return promise that fulfills when we are done initializing.
			return initBackend({
				require: options.API.NODE.require,
				process: options.API.NODE.process,
				Q: options.API.Q
			}).then(function(api) {

				// NOTE: `api` is the API that the UI should use to talk with the backend. The idea is that this
				//       api is the only link between UI and backend and that it can be routed over a typical web
				//	     stack instead of in-memory.
				return initUI({
					window: window,
					document: document,
					$: window.$,
					Q: options.API.Q,
					// TODO: Use browser-compatible implementation so we can port to browser.
					PATH: options.API.NODE.require("path"),
					GUI: options.API.GUI,
					BACKEND: api
				});
			});
		}
	}

	function initBackend(API) {

		var PATH = API.require("path");
		var FS = API.require("fs");
		// NOTE: Using just `marked` does not work here.
		var MARKED = API.require("./node_modules/marked");

		return API.Q.resolve({
			onFileChange: function(uri, callback) {
				var path = PATH.join(API.process.cwd(), "..", uri);
				function update() {
					callback(MARKED(FS.readFileSync(path).toString()));
				}
				FS.watch(path, { persistent: false }, update);
				update();
			}
		});
	}

	function initUI(API) {

		// NOTE: We only fire ready once the UI has fully initialized.
		var ready = API.Q.defer();
		API.$(API.document).ready(function() {

			API.BACKEND.onFileChange("README.md", function(html) {
				API.$("#markdown-viewer").html(html);

				// @see https://github.com/rogerwang/node-webkit/wiki/Shell
				API.$("#markdown-viewer a").each(function() {
					var link = API.$(this);
					link.on("click", function() {
						API.GUI.Shell.openExternal(link.attr("href"));
						return false;
					});
				});
			});

			ready.resolve();
		});
		return ready.promise;
	}
});
