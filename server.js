/********************************************************************************* 
*
*  Creator Name: Vladyslav Savchyn
* 
*  Cyclic Web App URL: not available rn ;(
* 
*  GitHub Repository URL: https://github.com/vsavchyn-dev/Blog-A-Gramm
* 
********************************************************************************/
const express = require("express");
const exphbs = require('express-handlebars');
const stripJs = require('strip-js');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const bodyParser = require('body-parser');
const clientSessions = require('client-sessions');
const env = require("dotenv");

var blogService = require('./blog-service.js');
var authData = require('./auth-service.js');
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

// Configure environment variables
env.config();

// Configure cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	secure: true
});

// Configure handlebars
app.engine('hbs', exphbs.engine({
	helpers: {
		navLink: function (url, options) {
			return `<li${(url == app.locals.activeRoute) ? ' class="active"' : ''}><a href="${url}">${options.fn(this)}</a></li>`;
		},
		equal: function (lvalue, rvalue, options) {
			if (arguments.length < 3) {
				throw new Error("Handlebars Helper equal needs 2 params");
			}
			if (lvalue != rvalue) {
				return options.inverse(this);
			} else {
				return options.fn(this);
			}
		},
		safeHTML: function (context) {
			return stripJs(context);
		},
		formatDate: function (dateObj) {
			const date = new Date(dateObj);
			let year = date.getFullYear();
			let month = (date.getMonth() + 1).toString().padStart(2, '0');
			let day = date.getDate().toString().padStart(2, '0');
			return `${year}-${month}-${day}`;
		}
	},
	defaultLayout: 'main',
	extname: '.hbs'
}));
app.set('view engine', 'hbs');

// Setup client-sessions
app.use(clientSessions({
	cookieName: "client_session",
	secret: "blog_a_gramm_app",
	duration: 2 * 60 * 1000,
	activeDuration: 60 * 1000
}));

app.use(function (req, res, next) {
	res.locals.session = req.client_session;
	next();
});

function ensureLogin(req, res, next) {
	if (!req.client_session.user) {
		res.redirect("/login");
	}
	next();
}

// Configure multer
const upload = multer();

// Configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set active route and viewing category in locals
app.use(function (req, res, next) {
	let route = req.path.substring(1);
	app.locals.activeRoute = "/" + (isNaN(route.split('/')[1]) ? route.replace(/\/(?!.*)/, "") : route.replace(/\/(.*)/, ""));
	app.locals.viewingCategory = req.query.category;
	next();
});

// Serve static files
app.use(express.static('public'));

////////////////////////
//   Public routes    //
////////////////////////
// setup a 'route' to listen on the default url path 
app.get("/", (req, res) => {
	res.redirect("/blog");
});

app.get("/about", (req, res) => {
	res.render('about');
});

app.get('/blog', async (req, res) => {

	// Declare an object to store properties for the view
	let viewData = {};

	try {

		// declare empty array to hold "post" objects
		let posts = [];

		// if there's a "category" query, filter the returned posts by category
		if (req.query.category) {
			// Obtain the published "posts" by category
			posts = await blogService.getPublishedPostsByCategory(req.query.category);
		} else {
			// Obtain the published "posts"
			posts = await blogService.getPublishedPosts();
		}

		// sort the published posts by postDate
		posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

		// get the latest post from the front of the list (element 0)
		let post = posts[0];

		// store the "posts" and "post" data in the viewData object (to be passed to the view)
		viewData.posts = posts;
		viewData.post = post;

	} catch (err) {
		viewData.message = "No results " + err;
	}

	try {
		// Obtain the full list of "categories"
		let categories = await blogService.getCategories();

		// store the "categories" data in the viewData object (to be passed to the view)
		viewData.categories = categories;
	} catch (err) {
		viewData.categoriesMessage = "No result " + err;
	}

	// render the "blog" view with all of the data (viewData)
	res.render("blog", { data: viewData })
});

app.get('/blog/:id', async (req, res) => {

	// Declare an object to store properties for the view
	let viewData = {};

	try {

		// declare empty array to hold "post" objects
		let posts = [];

		// if there's a "category" query, filter the returned posts by category
		if (req.query.category) {
			// Obtain the published "posts" by category
			posts = await blogService.getPublishedPostsByCategory(req.query.category);
		} else {
			// Obtain the published "posts"
			posts = await blogService.getPublishedPosts();
		}

		// sort the published posts by postDate
		posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
		// store the "posts" and "post" data in the viewData object (to be passed to the view)
		viewData.posts = posts;
	} catch (err) {
		viewData.message = "No results getPublished " + err;
	}

	try {
		// Obtain the post by "id"
		viewData.post = await blogService.getPostById(req.params.id);
	} catch (err) {
		viewData.message = "No results getPostbyId " + err;
	}

	try {
		// Obtain the full list of "categories"
		let categories = await blogService.getCategories();

		// store the "categories" data in the viewData object (to be passed to the view)
		viewData.categories = categories;
	} catch (err) {
		viewData.categoriesMessage = "No results getCategories " + err;
	}

	// render the "blog" view with all of the data (viewData)
	console.log(JSON.stringify(viewData));
	res.render("blog", { data: viewData })
});


////////////////////////
//LogIn/Register Pages//
////////////////////////

// Login Routes
app.get("/login", (req, res) => {
	res.render('login');
});

app.post("/login", (req, res) => {
	req.body.userAgent = req.get('User-Agent');
	
	authData.checkUser(req.body)
		.then((userData) => {
			req.client_session.user = {
				userName: userData.userName,
				email: userData.email,
				loginHistory: userData.loginHistory
			}
			res.redirect("/posts");
		})
		.catch(err => {
			console.log(err)
			res.render('login', {errorMessage: err, userName: req.body.userName});
		})
});

// Register Routes
app.get("/register", (req, res) => {
	res.render('register');
});

app.post("/register", (req, res) => {
	authData.registerUser(req.body)
		.then(() => {
			console.log("route-regist-succes" + JSON.stringify(req.body));
			res.render('register', {successMessage: "User Created"});
		})
		.catch(err => {
			console.log("route-regist-err" + JSON.stringify(req.body));
			res.render('register', {errorMessage: err, userName: req.body.userName});
		});
})

// LogOut route
app.get("/logout", (req, res) => {
	req.client_session.reset();
	res.redirect("/");
});

////////////////////////
// Logged user routes //
////////////////////////

// Posts Route
app.get("/posts", ensureLogin, (req, res) => {
	const { category, minDate } = req.query;

	if (category) {
		blogService.getPostsByCategory(parseInt(category))
			.then(posts => {
				if (posts.length > 0) {
					console.log(JSON.stringify(posts));
					res.render('posts', { posts: posts });
				}
				else {
					res.render('posts', { message: "no results" });
				}
			})
			.catch(error => {
				res.status(500).render('posts', { message: error });
			});
	}
	else if (minDate) {
		blogService.getPostsByMinDate(minDate)
			.then(posts => {
				if (posts.length > 0) {
					console.log(JSON.stringify(posts));
					res.render('posts', { posts: posts });
				}
				else {
					res.render('posts', { message: "no results" });
				}
			})
			.catch(error => {
				res.status(500).render('posts', { message: error });
			});
	}
	else {
		blogService.getAllPosts()
			.then(posts => {
				if (posts.length > 0) {
					console.log(JSON.stringify(posts));
					res.render('posts', { posts: posts });
				}
				else {
					res.render('posts', { message: "no results" });
				}
			})
			.catch(error => {
				res.status(500).render('posts', { message: error });
			});
	}
});

app.get("/posts/add", ensureLogin, (req, res) => {
	blogService.getCategories()
		.then((categories) => {
			res.render('addPost', { categories: categories });
		})
		.catch(() => {
			res.render('addPost', { categories: [] });
		})
});

app.get("/posts/:id", ensureLogin, (req, res) => {
	blogService.getPostById(parseInt(req.params.id))
		.then(post => {
			res.json(post);
		})
		.catch(error => {
			res.status(500).json({ error: error });
		});
});

app.post("/posts/add", ensureLogin, upload.single("featureImage"), (req, res) => {
	if (req.file !== undefined) {
		let streamUpload = (req) => {
			return new Promise((resolve, reject) => {
				let stream = cloudinary.uploader.upload_stream(
					(error, result) => {
						if (result) {
							resolve(result);
						} else {
							reject(error);
						}
					}
				);

				streamifier.createReadStream(req.file.buffer).pipe(stream);
			});
		};

		async function upload(req) {
			let result = await streamUpload(req);
			console.log(result);
			return result;
		}

		upload(req)
			.then((uploaded) => {
				processPost(uploaded.secure_url);
			})
			.catch((error) => {

			});
	} else {
		processPost("");
	}

	function processPost(imageUrl) {
		req.body.featureImage = imageUrl;

		blogService.addPost(req.body)
			.then((newPost) => {
				res.redirect("/posts");
			})
			.catch((error) => {
				res.status(500).json({ error: error });
			});
	}
});

app.get("/posts/delete/:id", ensureLogin, (req, res) => {
	blogService.deletePostById(req.params.id)
		.then(() => {
			res.redirect("/posts")
		})
		.catch(err => {
			res.status(500).render("Unable to Remove Post / Post not found");
		})
});


// Categories Route

app.get("/categories", ensureLogin, (req, res) => {
	blogService.getCategories()
		.then(categories => {
			if (categories.length > 0) {
				res.render('categories', { categories: categories });
			}
			else {
				res.render('categories', { message: "no results" });
			}
		})
		.catch(error => {
			res.render('categories', { message: error });
		});
});

app.get("/categories/add", ensureLogin, (req, res) => {
	res.render('addCategory');
});

app.post("/categories/add", ensureLogin, (req, res) => {
	blogService.addCategory(req.body.category)
		.then((newPost) => {
			res.redirect("/categories");
		})
		.catch((error) => {
			res.status(500).json({ error: error });
		});
});

app.get("/categories/delete/:id", ensureLogin, (req, res) => {
	const id = parseInt(req.params.id)
	if (isNaN(id)) {
		res.status(400).send('Invalid category ID');
		return;
	}
	blogService.deleteCategoryById(id)
		.then(() => {
			res.redirect("/categories");
		})
		.catch(err => {
			res.status(500).render("Unable to Remove Category / Category not found");
		})
});

// Uset history
app.get("/userHistory", ensureLogin, (req, res) => {
	res.render('userHistory');
});


// Custom 404 page
app.use((req, res) => {
	res.status(404).render('404');
});

// Starting point
blogService.initialize()
	.then(authData.initialize)
	.then(() => {
		app.listen(HTTP_PORT, () => {
			console.log(`Express http server listening on port ${HTTP_PORT}`);
		});
	})
	.catch(error => {
		console.error("Error initializing: ", error);
	});