const async  = require('async'),
      fs     = require('fs'),
      multer = require('multer'),
      path   = require('path'),
      uuidv4 = require('uuid/v4');

const constants = require('./constants'),
      nodebb    = require('./nodebb');

const nconf   = nodebb.nconf,
      plugins = nodebb.plugins;

let files = {};

(function (Uploads) {
    // Multer File Object - https://github.com/expressjs/multer#multer-file-object

    Uploads.init = function (router, middleware, done) {
        async.waterfall([
            async.apply(createTemporalStorage),
            function (storage, next) {
                addRoute(storage, router, middleware, next);
            }
        ], done);
    };

    function addRoute(storage, router, middleware, done) {
        let route = path.join(
            constants.API_PATH,
            constants.PLUGIN_PATH,
            constants.IMAGE_SERVICE_PATH
        );
        let fileMiddleware = multer({storage: storage}).single('award');

        router.post(route, [fileMiddleware, middleware.applyCSRF, middleware.authenticateRequest, middleware.ensureLoggedIn], function (req, res, next) {
            let saveDidComplete = (error, file) => {
                let entityId = req.headers['x-ns-award-entity-id'];

                if (error) {
                    return res.status(500).json(error);
                }

                fs.unlink(file.path, function (error) {
                    if (error) {
                        return res.status(500).json(error);
                    }

                    files[entityId] = file;

                    res.json({
                        entityId: entityId,
                        file    : file,
                        storage : Uploads.isLocalFile(file) ? constants.FILE_LOCAL : constants.FILE_REMOTE
                    });
                });
            };

            if (plugins.hasListeners('filter:uploadImage')) {
                storeCloud(req.file, req.user, saveDidComplete);
            } else {
                storeLocal(req.file, saveDidComplete);
            }
        });

        done(null);
    }

    function createTemporalStorage(done) {
        done(null, multer.diskStorage({
            destination: function (req, file, next) {
                next(null, path.resolve(__dirname, '../public/uploads/'));
            },
            filename   : function (req, file, next) {
                let name = 'award-';
                name += uuidv4();
                // Append image extension
                name += path.extname(file.originalname);
                next(null, name);
            }
        }));
    }

    Uploads.deleteImage = function (imageUri, done) {
        if (imageUri.indexOf('http') === 0) {
            // Image is remote.
            // Remote API is required to delete a file.
            done(null);
        } else {
            fs.unlink(Uploads.getUploadPath(imageUri), function (error) {
                if (error) {
                    // Fail silently
                    console.warn('[NS Awards, Uploads]: can not delete file ' + imageUri + ', error: ' + error);
                }
                done(null);
            });
        }
    };

    Uploads.getFileById = function (id, done) {
        done(null, files[id]);
    };

    Uploads.getFinalDestination = function (file, done) {
        let destination = null;

        if (Uploads.isLocalFile(file)) {
            destination = file.filename;
        } else {
            destination = file.url;
        }

        done(null, destination);
    };

    Uploads.getImageUrl = function (image, done) {
        let url = image.indexOf('http') === 0 ? image : path.join(nconf.get('relative_path'), nconf.get('upload_url'), constants.UPLOAD_DIR, image);

        done(null, url);
    };

    Uploads.getUploadPath = function (fileName) {
        return path.join(nconf.get('upload_path'), constants.UPLOAD_DIR, fileName);
    };

    Uploads.isLocalFile = function (file) {
        return file.hasOwnProperty('localPath');
    };

    Uploads.replaceFile = function (previousImageUri, fileId, file, done) {
        async.waterfall([
            // Delete local file if possible
            async.apply(Uploads.deleteImage, previousImageUri),
            // Delete upload from the memory
            function (callback) {
                if (!files.hasOwnProperty(fileId)) {
                    // Fail silently
                    console.warn('[NS Awards, Uploads]: can not delete file from memory at ' + fileId);
                }
                delete files[fileId];
                callback(null);
            },
            async.apply(Uploads.getFinalDestination, file)
        ], done);
    };

    function storeCloud(file, user, done) {
        let imageFile = Object.assign({}, file, {name: file.originalname});

        plugins.fireHook('filter:uploadImage', {
            image: imageFile,
            uid  : user.uid
        }, function (error, image) {
            if (error) {
                return done(error);
            }
            // Image object, properties:
            // - {string} name
            // - {string} url fully qualified URL to the cloud storage

            done(null, Object.assign({}, file, image));
        });
    }

    function storeLocal(file, done) {
        const uploadPath = Uploads.getUploadPath(file.filename);

        fs.copyFile(file.path, uploadPath, error => {
            if (error) {
                return done(error);
            }

            done(null, Object.assign({}, file, {localPath: uploadPath}));
        });
    }

})(module.exports);
