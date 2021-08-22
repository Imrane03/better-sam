
let loadFixture;
if (typeof XMLHttpRequest === 'undefined') {
  loadFixture = (file) => {
    return require('./' + file)
  }
} else {
  loadFixture = function (url) {
    url = loadFixture.base + url;
    const xhr = new XMLHttpRequest();
    let json = null;
    xhr.open("GET", url, false);
    xhr.onload = function (e) {
      if (xhr.status === 200) {
        json = JSON.parse(xhr.responseText);
      } else {
        console.error('readJSON', url, xhr.statusText);
      }
    };

    xhr.onerror = function (e) {
      console.error('readJSON', url, xhr.statusText);
    };

    xhr.send(null);
    return json;
  };
  loadFixture.base = '/base/test/';
}

export default loadFixture;
