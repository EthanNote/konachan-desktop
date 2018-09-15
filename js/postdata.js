var fs = require('fs');
var request = require('requestretry');

var mergePostList = function (oldList, newList, override = true) {

  var mergedList = [];
  var i = 0;
  var j = 0;

  while (i < oldList.length && j < newList.length) {
    if (oldList[i].id > newList[j].id) {
      mergedList.push(oldList[i]);
      i++;
    }
    else {
      mergedList.push(newList[j]);
      j++;
    }
  }

  while (i < oldList.length) {
    mergedList.push(oldList[i]);
    i++;
  }

  while (j < newList.length) {
    mergedList.push(newList[j]);
    j++;
  }

  return mergedList;
}


var PostList = function () {
  this.curPage = 0;
  this.oldList = [];
  this.pending = -1;
  this.tags = [];
  this.pageLimit = 10;
  this.retrys = 5;
}

PostList.prototype.getNextBatch = function () {
  if (this.pending >= 0) {
    console.warn("Pending busy");
    return;
  }

  if (this.onPendingStart) {
    this.onPendingStart();
  }

  let nextPage = this.curPage + 1;
  this.pending = nextPage;
  var self = this;
  let fullTags = Array.from(this.tags);
  fullTags.push('rating:safe');
  let url = 'http://www.konachan.net/post.json?tags=' + fullTags.join(' ') + '&limit=' + this.pageLimit + '&page=' + nextPage;
  console.log("URL: ", url);
  request({
    url: url,
    timeout: 5000,
    maxAttempts: self.retrys,
  }, function (error, response, body) {
    self.pending = -1;
    if (!error && response.statusCode == 200) {
      self.curPage = nextPage;
      var newList = JSON.parse(body);
      if (self.oldList.length <= 0) {
        self.oldList = newList;
        if (self.onUpdate) {
          self.onUpdate(newList);
        }
        return;
      }

      var mergedList = mergePostList(self.oldList, newList);

      self.oldList = mergedList;

      if (self.onUpdate) {
        self.onUpdate(mergedList, newList);
      }
    }
    else {
      console.warn("ERROR ", error, response, body);
      self.onUpdate()
    }

  })
}

PostList.prototype.getCachedPosts = function (cache) {
  if (!cache.postdict) {
    var self = this;
    cache.loadAsync(function () {
      var mergedList = mergePostList(self.oldList, cache.posts);
      self.oldList = mergedList;

      if (self.onUpdate) {
        self.onUpdate(mergedList, cache.posts);
      }
    });
    return;
  }

  var mergedList = mergePostList(this.oldList, cache.posts);
  this.oldList = mergedList;

  if (this.onUpdate) {
    this.onUpdate(mergedList, cache.posts);
  }
}


const PostCache = function (fname) {
  this.fname = fname;
}

PostCache.prototype.cache = function (list, override = true) {
  if (!this.postdict) {
    this.postdict = {};
  }

  for (let i = 0; i < list.length; i++) {
    var id = list[i].id;
    if (!this.postdict[id] || override) {
      this.postdict[id] = list[i];
    }
  }
  var newList = [];
  for (let k in this.postdict) {
    newList.push(this.postdict[k]);
  }
  newList.sort(function (a, b) { return b.id - a.id });
  this.posts = newList;
}

PostCache.prototype.load = function () {
  try {
    var data = fs.readFileSync(this.fname);
    this.posts = JSON.parse(data);
  }
  catch (e) {
    this.posts = [];
  }

  this.postdict = {};
  for (let i = 0; i < this.posts.length; i++) {
    this.postdict[this.posts[i].id] = this.posts[i];
  }

}

PostCache.prototype.loadAsync = function (callback) {
  var self = this;
  fs.readFile(self.fname, function (err, data) {
    if (err) {
      self.posts = [];
      console.error(err);
      return;
    }
    try {
      //var data = fs.readFileSync(this.fname);
      self.posts = JSON.parse(data);
    }
    catch (e) {
      self.posts = [];
    }

    self.postdict = {};
    for (let i = 0; i < self.posts.length; i++) {
      self.postdict[self.posts[i].id] = self.posts[i];
    }
    if (callback) {
      callback(self);
    }

  });

}



PostCache.prototype.save = function () {
  fs.writeFileSync(this.fname, JSON.stringify(this.posts));
}


var PostListManager = function () {
  this.current = null;
}

PostListManager.prototype.Create = function (tags) {
  var list = new PostList();
  if (tags) {
    list.tags = tags;
  }
  return list;
}


PostListManager.prototype.SetCurrent = function (list) {
  if (this.current) {
    this.current.onPendingStart = null;
    this.current.onUpdate = null;
  }
  this.current = list;
  this.current.onPendingStart = this.onPendingStart;
  this.current.onUpdate = this.onUpdate;
}


module.exports = { PostList: PostList, PostCache: PostCache, PostListManager: PostListManager };