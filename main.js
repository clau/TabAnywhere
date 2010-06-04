window.addEvent('domready', function() {
	new TwitterAnywhere();
});

var TwitterAnywhere = new Class({
	initialize: function() {
		this.maxChar = 140;
		this.loginButton = $('login');
		this.twitter = $('twitter');
		twttr.anywhere(function(T) {
			this.client = T;
			T("#login").connectButton({
				size: 'xlarge',
				authComplete: this.login.bind(this)
			});
			if (T.isConnected()) {
				this.login(T.currentUser);
			}
		}.bind(this));
	},

	login: function(user) {
		this.user = user;
		
		// hide login button
		this.loginButton.setStyle('display', 'none');
		
		// show twitter
		this.twitter.setStyle('display', 'block');

		// create tweet box
		this.timeline = new Element('ol', {'id': 'timeline'});
		this.moreButton = new Element('div', {
			'id': 'more',
			'class': 'comment-button',
			'events': {
				'click': this.loadMore.bind(this)
			}
		}).adopt(new Element('span', {
			'html': 'MORE'
		}));
		
		this.twitter.adopt(this.renderComposer(), this.timeline, this.moreButton);
		
		// load tweets
		this.user.homeTimeline(function(statuses) {
			this.max_id = statuses.first().id;
			this.min_id = statuses.last().id;

			var elements = [];
			statuses.each(function(status) {
				elements.push(this.renderTweet(status));
			}.bind(this));
			this.timeline.adopt(elements);
		}.bind(this));
		
		this.commentArea.focus();
		this.refresher = this.refresh.periodical(45000, this);
	},

	logout: function() {
		$clear(this.refresher);
		twttr.anywhere.signOut();
		this.twitter.setStyle('display', 'none').empty();
		this.loginButton.setStyle('display', 'block');
	},
	
	loadMore: function() {
		this.user.homeTimeline({
			max_id: this.min_id - 1
		}).each(function(status) {
			this.timeline.adopt(this.renderTweet(status));
		}.bind(this)).last(function(status) {
			if (status) {
				this.min_id = status.id;
			} else {
				this.moreButton.setStyle('display', 'none');
			}
		}.bind(this));
	},
	
	tweet: function() {
		if (this.commentButton.disabled) {
			var commentLength = this.commentArea.value.length;
			if (commentLength == 0) {
				alert('The tweet cannot be empty.');
			} else if (commentLength > this.maxChar) {
				alert('The tweet cannot exceed ' + this.maxChar + ' characters.');
			}
		} else {
			this.updateSubmitButton(true);
			// TODO: the API seems to lack a failure callback
			this.client.Status.update(this.commentArea.value, function(status) {
				this.resetForm();
				this.refresh();
			}.bind(this));
		}
	},
	
	refresh: function() {
		this.user.homeTimeline({
			since_id: this.max_id
		}).each(function(status) {
			this.renderTweet(status).inject(this.timeline, 'top');
		}.bind(this)).first(function(status) {
			if (status) {
				this.max_id = status.id;
			}
		}.bind(this));
		
		this.timeline.getElements('span.entry-date').each(function(date) {
			date.set('html', this.prettydate(date.get('title')));
		}.bind(this));
	},
	
	resetForm: function() {
		this.updateCounter(this.maxChar);
		this.commentArea.set('value', '').focus();
	},
	
	linkify: function(text){
		return text.replace(/(https?:\/\/[\w\-:;?&=+.%#\/]+)/gi, '<a target="twitter" href="$1">$1</a>')
				   .replace(/(^|\W)@(\w+)/g, '$1<a target="twitter" href="http://twitter.com/$2">@$2</a>')
				   .replace(/(^|\W)#(\w+)/g, '$1#<a target="twitter" href="http://search.twitter.com/search?q=%23$2">$2</a>');
	},
	
	prettydate: function(timestamp) {
		var diff = Math.floor(((new Date()).getTime() - Date.parse(timestamp))/1000);
		var day_diff = Math.floor(diff / 86400);

		if (diff < 10) {
			return "Just now";
		}

		if (day_diff == 0) {

			if (diff < 60) {
				return diff + " seconds ago";
			}

			if (diff < 120) {
				return "1 minute ago";
			}

			if (diff < 3600) {
				return Math.floor(diff/60) + " minutes ago";
			}

			if (diff < 7200) {
				return "an hour ago";
			}

			if (diff < 86400) {
				return Math.floor(diff/3600) + " hours ago";
			}
		}

		if (day_diff == 1) {
			return "Yesterday";
		}

		if (day_diff < 7) {
			return day_diff + " days ago";
		}

		if (day_diff < 31) {
			return Math.floor(day_diff/7) + " weeks ago";
		}

		if (day_diff < 365) {
			return Math.floor(day_diff/30) + " months ago";
		}

		return Math.floor(day_diff/365) + " years ago";
	},

	updateSubmitButton: function(disabled) {
		var className = 'comment-button-disabled';
		this.commentButton.disabled = disabled;
		if (disabled) {
			this.commentButton.addClass(className);
		} else {
			this.commentButton.removeClass(className);
		}
	},

	updateCounter: function(len) {
		var color = '#CCC';
		if (len < 10) {
			color = "#D40D12";
		} else if (len < 20) {
			color = "#5C0002";
		}
		this.commentCounter.set('text', len).setStyle('color', color);
	},

	onKeyup: function() {
		var len = this.maxChar - this.commentArea.value.length;
		this.updateCounter(len);
		this.updateSubmitButton(len < 0 || len == this.maxChar);
	},

	renderComposer: function() {
		/*
		<form id="composer">
			<h1>What's happening?</h1>
			<div>
				<img src="some.png" class="thumbnail"/>
				<textarea name="content" class="comment-area" ></textarea>
			</div>
			<div class="comment-left-container">
				<span class="comment-io">LOGOUT</span>
				<span class="comment-username">@ONEBIZYMAMA</span>
			</div>
			<div class="comment-right-container">
				<div id="comment-counter">this.maxChar</div>
				<div id="comment-button"><span>Tweet</span></div>
			</div>
		</form>
		*/
		// Header
		var header = new Element('h1',  {
			'html': "What's happening?"
		});
		
		// Top Container
		var thumbnail = new Element('span', {
			'class': 'thumbnail'
		}).adopt(new Element('img', {
			'src': this.user.profileImageUrl
		}));

		this.commentArea = new Element('textarea', {
			'class': "comment-area",
			'name': 'content',
			'events': {
				'keyup': this.onKeyup.bind(this)
			}
		});

		var commentTopContainer = new Element('div').adopt(thumbnail, this.commentArea);

		// Left Container
		var logout = new Element('span', {
			'class': 'comment-io',
			'html': 'Logout',
			'events': {
				'click': this.logout.bind(this)
			}
		});

		var username = new Element('span', {
			'class': 'comment-username',
			'html': '@'+this.user.screenName
		});

		var commentLeftContainer = new Element('div', {
			'class': 'comment-left-container'
		}).adopt(logout, username);

		// Right Container
		this.commentCounter = new Element('div', {
			'class': 'comment-counter',
			'html': this.maxChar
		});

		this.commentButton = new Element('div', {
			'class': 'comment-button',
			'events': {
				'click': this.tweet.bind(this)
			}
		}).adopt(new Element('span', {
			'html': 'TWEET'
		}));

		var commentRightContainer = new Element('div', {
			'class': 'comment-right-container'
		}).adopt(this.commentCounter, this.commentButton);
		
		return new Element('form', {
			'id': 'composer'
		}).adopt(header, commentTopContainer, commentRightContainer, commentLeftContainer);
	},
	
	renderTweet: function(status) {
		/*
		<li>
			<a class="thumbnail" target="twitter" href="http://twitter.com/tabqwerty">
				<img src="some.png" />
			</a>
			<span class="entry">
				<strong>
					<a target="twitter" href="http://twitter.com/tabqwerty">tabqwerty</a>
				</strong>
				<span class="entry-content">
					Hello World
				</span>
				<span class="entry-date">
					1 minute ago
				</span>
			</span>
		</li>
		*/
		var user = status.user;
		var screenname = user.screenName;
		var url = 'http://twitter.com/'+screenname;
		
		var thumbnail = new Element('a', {
			'class': 'thumbnail',
			'target': '_blank',
			'href': url
		}).adopt(new Element('img', {
			'src': user.profileImageUrl
		}));

		var username = new Element('strong').adopt(new Element('a', {
			'target': '_blank',
			'href': url,
			'html': screenname
		}));

		var content = new Element('span', {
			'class': 'entry-content',
			'html': ' ' + this.linkify(status.text)
		});

		var date = new Element('span', {
			'class': 'entry-date',
			'title': status.createdAt,
			'html': this.prettydate(status.createdAt)
		});

		var entry = new Element('span', {
			'class': 'entry'
		}).adopt(username, content, date);

		return new Element('li').adopt(thumbnail, entry);
	}
});