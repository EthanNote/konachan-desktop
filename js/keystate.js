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