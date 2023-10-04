/********************************************************************************* 
*
*  Creator Name: Vladyslav Savchyn
* 
*  Cyclic Web App URL: not available rn ;(
* 
*  GitHub Repository URL: https://github.com/vsavchyn-dev/Blog-A-Gramm
* 
********************************************************************************/
const { rejects } = require('assert');
const { resolve } = require('dns');
const Sequelize = require('sequelize');
const env = require("dotenv");

// Configure environment variables
env.config();

////////////////////////
//  DB Configuration  //
////////////////////////

var sequelize = new Sequelize(process.env.POSTGRE_DATABASE, process.env.POSTGRE_USERNAME, process.env.POSTGRE_PASSWORD, {
	host: process.env.POSTGRE_HOST,
	dialect: 'postgres',
	port: 5432,
	dialectOptions: {
		ssl: { rejectUnauthorized: false }
	},
	query: { raw: true }
});

var Post = sequelize.define('Post', {
	body: Sequelize.TEXT,
	title: Sequelize.STRING,
	postDate: Sequelize.DATE,
	featureImage: Sequelize.STRING,
	published: Sequelize.BOOLEAN
});

var Category = sequelize.define('Category', {
	category: Sequelize.STRING
});

Post.belongsTo(Category, { foreignKey: 'category' });


////////////////////////
//   Initialization   //
////////////////////////

function initialize() {
	return new Promise((resolve, reject) => {
		sequelize
			.authenticate()
			.then(() => {
				console.log('Authentication sucseed')
			})
			.catch(err => {
				reject("Unable to authenticate to the database: ", err);
			});

		sequelize.sync()
			.then(() => {
				resolve();
			})
			.catch(err => {
				reject("Unable to sync the database: ", err);
			});
	});
}


////////////////////////
//   Post Functions   //
////////////////////////

function getAllPosts() {
	return new Promise((resolve, reject) => {
		Post.findAll({})
			.then(data => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			});
	});
}

function getPostById(_id) {
	return new Promise((resolve, reject) => {
		Post.findOne({
			where: {
				id: _id
			}
		})
			.then((data) => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			});
	});
}

function getPostsByCategory(category) {
	return new Promise((resolve, reject) => {
		Post.findAll({
			where: {
				category: category
			}
		})
			.then(data => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			})
	});
}

function getPublishedPostsByCategory(category) {
	return new Promise((resolve, reject) => {
		Post.findAll({
			where: {
				category: category,
				published: true
			}
		})
			.then(data => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			})
	});
}

function getPostsByMinDate(minDateStr) {
	return new Promise((resolve, reject) => {
		const { gte } = Sequelize.Op;

		Post.findAll({
			where: {
				postDate: {
					[gte]: new Date(minDateStr)
				}
			}
		})
			.then(data => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			})
	});
}

function getPublishedPosts() {
	return new Promise((resolve, reject) => {
		Post.findAll({
			where: {
				published: true
			}
		})
			.then(data => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			})
	});
}

function addPost(postData) {
	return new Promise((resolve, reject) => {
		postData.published = (postData.published) ? true : false;

		postData.postDate = new Date();

		for (var obj in postData) {
			obj = obj == "" ? null : obj;
		}

		Post.create({
			body: postData.body,
			title: postData.title,
			postDate: postData.postDate,
			featureImage: postData.featureImage,
			published: postData.published,
			category: postData.category
		})
			.then(data => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			})

	});
}

function deletePostById(postId) {
	return new Promise((resolve, reject) => {
		const id = parseInt(postId)
		if (isNaN(id)) {
			reject("Invalid Id");
		}

		Post.destroy({
			where: {
				id: id
			}
		})
			.then(() => {
				resolve();
			})
			.catch(err => {
				reject(err);
			});
	});
}


////////////////////////
//Categories Functions//
////////////////////////

function getCategories() {
	return new Promise((resolve, reject) => {
		Category.findAll({})
			.then(data => {
				resolve(data);
			})
			.catch(err => {
				reject(err);
			})
	});
}

function addCategory(_category) {
	return new Promise((resolve, reject) => {
		console.log(JSON.stringify(_category));
		console.log(JSON.stringify(_category));

		Category.create({
			category: _category
		})
			.then(() => {
				resolve();
			})
			.catch(err => {
				reject(err);
			});
	});
}

function deleteCategoryById(categoryId) {
	return new Promise((resolve, reject) => {
		const id = parseInt(categoryId);
		if (isNaN(id)) {
			reject("Invalid ID");
		}

		Category.destroy({
			where: {
				id: id
			}
		})
			.then(() => {
				resolve();
			})
			.catch(err => {
				reject(err);
			});
	})
}

module.exports = {
	initialize,
	getAllPosts,
	getPostById,
	getPostsByMinDate,
	getPublishedPosts,
	getPostsByCategory,
	getPublishedPostsByCategory,
	addPost,
	deletePostById,
	getCategories,
	addCategory,
	deleteCategoryById
};
