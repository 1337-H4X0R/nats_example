/* Licence: public domain (The Unlicense) */

'use strict';

/* namespace 'nats_example' */
let nats_example = (function()
{
	/* utility function for adding days to date */
	Date.prototype.add_days = function(days)
	{
		/* 'parseInt' is needed if 'days' is string */
		this.setDate(this.getDate() + parseInt(days));
		return this;
	}


	/* import 'sequelize' module */
	const Sequelize = require('sequelize');
	
	/* establish connection with postgresql database */
	const sequelize = new Sequelize('mydb', 'postgres', 'postgres',
	{
		dialect: 'postgres',

		define:
		{
			/* disable pluralizing table names */
			freezeTableName: true,
			/* disable additional table columns */
			timestamps: false
		}
	});

	/* definition of table 'content' */
	const Content = sequelize.define('content',
	{
		id:
		{
			type: Sequelize.INTEGER,
			primaryKey: true
		},
		content_uid: Sequelize.STRING,
		expires: Sequelize.DATE
	});
	
	/* add table to database */
	/* 'force: true' recreates table */
	Content.sync({force: true});


	/* import 'nats' module */
	const Nats = require('nats');
	
	/* establish connection with nats server */
	const nats = Nats.connect();

	const run_subscriber = function()
	{
		/* subscribe to 'content.add' */
		nats.subscribe('content.add', json_message =>
		{
			/* convert json string to object */
			const message = JSON.parse(json_message);
			
			/* create new table row from received message */
			Content.create(
			{
				id: message.id,
				content_uid: message.content_uid,
				expires: new Date().add_days(2)
			})
			.then(() =>
			{
				/* save changes to database */
				Content.sync();
			});
		});
	};
	
	const run_publisher = function()
	{
		let i = 0;

		/* periodically (every 3 seconds) publish new message */
		setInterval(() =>
		{
			/* convert message to json string */
			nats.publish('content.add', JSON.stringify(
			{
				id: i,
				content_uid: i.toString()
			}));
			++i;
		}, 3000);
	};
	
	/* export public functions */
	return {
		run_subscriber : run_subscriber,
		run_publisher : run_publisher
	};
}());

nats_example.run_subscriber();
nats_example.run_publisher();