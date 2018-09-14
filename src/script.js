const PostData = require('./postdata');

//const postList = new PostData.PostList();
const postListManager = new PostData.PostListManager();

// const cache = new PostData.PostCache('cache.json');
// cache.load();

const vm = new Vue({
  el: "#post_display",
  data: {
    posts: [],
    rows: 4,
    frameWidth: 320,
    isLoading: false,
    //isPreview: true,
    //zIndex:-1,
    paddingLeft: 0,
    curPost: {
      file_url: "",
      id: -1,
      author: "null",
      tags: ""
    }
  },
  methods: {

    viewBigImage: function (post) {
      if (post) {

        document.getElementById('big_image').style.background = post.preview_url;
        document.getElementById('big_image').src = post.file_url;
        document.getElementById('big_view').hidden = false;
        this.curPost = post;
        document.body.style.overflowY = "hidden";

      }
      else {
        document.body.style.overflowY = "unset";
        document.getElementById('big_view').hidden = true;
      }
      console.log(post);

    }
  },

  computed: {
    getTags: function () {
      if (this.curPost && this.curPost.tags) {
        return this.curPost.tags.replace(/ /g, '<br>');
      }
      return ''
    },

    postRows: function () {
      var result = [];
      var i = 0;
      while (1) {
        var nextLine = this.posts.slice(this.rows * i, this.rows * (i + 1));
        if (nextLine.length <= 0) {
          break;
        }
        result.push(nextLine);
        i++;
      }
      return result;
    },

    frameStyle: function () {
      //return { width: `${100 / this.rows}%` }
      return { width: `${this.frameWidth}px` }
    },

    paddingStyle: function () {
      return { 'padding-left': `${this.paddingLeft}px` }
    }

  }
})

var autoUpdateRow = function () {
  var rows = parseInt((window.innerWidth - 16) / vm._data.frameWidth);
  if (rows <= 0) {
    rows = 1;
  }

  vm._data.rows = rows;
}



postListManager.onUpdate = function (mergedList, newList) {
  vm._data.isLoading = false;
  if (!mergedList) {
    return;
  }
  vm._data.posts = mergedList;
  var cacheList = newList || mergedList;
  // cache.cache(cacheList);
  // cache.save();
  tryAutoLoadMore();
}

postListManager.onPendingStart = function () {
  vm._data.isLoading = true;
}

var KeyStateListener = function (callback) {
  var state = {}
  this.state = state;

  window.addEventListener('keydown', function (event) {
    state[event.key] = true;
    callback(state);
  })

  window.addEventListener('keyup', function (event) {
    state[event.key] = false;
    callback(state);
  })
}




var listener = new KeyStateListener(function (state) {
  console.log(state);
  if (!state['Control'] && state['Alt'] && state['=']) {
    vm._data.frameWidth += 20;
  }
  if (!state['Control'] && state['Alt'] && state['-']) {
    vm._data.frameWidth -= 20;
  }
  autoUpdateRow()

})


var search = function (text) {
  // if (window._lastSearchText == text) {
  //   return;
  // }
  // window._lastSearchText = text;

  var splits = text.split(' ');
  var tags = [];
  for (let i = 0; i < splits.length; i++) {
    if (splits[i].length > 0) {
      tags.push(splits[i]);
    }
  }

  if (tags.join(' ') == postListManager.current.tags.join(' ')) {
    return;
  }

  var list = postListManager.Create(tags);
  postListManager.SetCurrent(list);
  list.getNextBatch();

}


window.onload = function () {
  postListManager.SetCurrent(postListManager.Create());
  autoUpdateRow();
  // vm._data.frameWidth = window.innerWidth / vm._data.rows;
  // console.log(vm._data.frameWidth, window.innerWidth, vm._data.rows);

  window.addEventListener('resize', function (event) {
    autoUpdateRow();
    console.log(event);
    if (vm._data.rows > 1 && (window.innerWidth - 16) - vm._data.rows * vm._data.frameWidth > vm._data.frameWidth * 0.5) {
      vm._data.rows += 1;
      vm._data.frameWidth = (window.innerWidth - 16) / vm._data.rows;
    }
    else {
      vm._data.frameWidth = (window.innerWidth - 16) / vm._data.rows;
    }
  })

  document.getElementById('search_input').addEventListener('keypress', function (event) {
    if (event.keyCode == 13) {
      console.log(event);
      search(event.target.value);
      event.target.select();
    }
  })

  document.getElementById('search_button').addEventListener('click', function (event) {
    console.log(event);
    var input = document.getElementById('search_input');
    search(input.value);
    input.focus();
    input.select();
  })

  postListManager.current.getNextBatch();
  //postListManager.current.getCachedPosts(cache);

  var opts = {
    lines: 9, // The number of lines to draw
    length: 7, // The length of each line
    width: 2, // The line thickness
    radius: 14, // The radius of the inner circle
    corners: 0, // Corner roundness (0..1)
    rotate: 0, // The rotation offset
    color: '#000', // #rgb or #rrggbb
    speed: 1.1, // Rounds per second
    trail: 100, // Afterglow percentage
    shadow: true, // Whether to render a shadow
    hwaccel: true, // Whether to use hardware acceleration
    className: 'spinner', // The CSS class to assign to the spinner
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    top: 'auto', // Top position relative to parent in px
    left: 'auto' // Left position relative to parent in px
  };
  var target = document.getElementById('loading');
  var spinner = new Spinner(opts).spin(target);

}

var isInsight = function (element) {
  //滚动条高度+视窗高度 = 可见区域底部高度
  var visibleBottom = window.scrollY + document.documentElement.clientHeight;
  //可见区域顶部高度
  var visibleTop = window.scrollY;

  var centerY = element.offsetTop + (element.offsetHeight / 2);
  return centerY > visibleTop && centerY < visibleBottom;
}

var tryAutoLoadMore = function () {
  if (isInsight(document.getElementById("more"))) {
    console.log("Auto load");
    postListManager.current.getNextBatch();
  }

}

window.addEventListener('scroll', function () {
  tryAutoLoadMore();
})