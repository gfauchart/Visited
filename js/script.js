

var gameElement = document.querySelector('.game');
var gameStarted = false;
var urlParameter = location.search.replace(/^\?/, '').split('&').map(function(param){ return param.split('=')});

var elementClicked = 0;
var time = 20;

var elementClickedDom = document.querySelector('.clicked');
var timeDom = document.querySelector('.time');

var MAX_POSITIVE_CLICK = 2;

timeDom.innerHTML = time;
elementClickedDom.innerHTML = elementClicked;

gameElement.addEventListener("click", function(e) {
  e.preventDefault();
  if (gameStarted) {
    if (gameElement !== e.target) {
        manager.clicked(e.target.getAttribute('number'))
        elementClickedDom.innerHTML = ++elementClicked;
    }
  } else {
    gameStarted = true;
    gameElement.removeChild(document.querySelector('.play'));

    var tid = setInterval(function() {
      timeDom.innerHTML = --time;
      if (time === 0) {
        clearInterval(tid);
        manager.stop();
        document.querySelector('.reveal').style.display = 'block'
        gameElement.setAttribute('class', 'game fade');
        siteManager.printResult();
      }
    }, 1000)
  }

});

var SIZE = 10;

function SiteManager(sites) {

    this.sites = sites;
    this.copyList = sites.slice(0);

    this.index = 0;
    this.result = {};

    this.getSite = function(){
      if (this.copyList.length === 0 || Math.floor((Math.random() * 100) % 10) === 0) {
        return document.location.origin;
      }

      var s = this.copyList.splice(Math.floor(Math.random()*this.copyList.length), 1)[0];

      if (this.copyList.length === 0) {
        this.copyList = this.sites.slice(0);
      }

      return s;
    }

    this.visited = function(url, visited) {
      if (url != document.location.origin) {
        this.result[url] = (+visited) + (this.result[url] || 0);
        if (this.result[url] >= MAX_POSITIVE_CLICK) {
          var idx = this.sites.indexOf(url);

          if (idx != -1) {
            this.sites.splice(idx, 1);
          }
        }
      }
    }

    this.printResult = function() {

        var siteElements = document.querySelector('.sites');

        for (site in this.result) {
          var element = document.createElement('a');

          element.setAttribute('href', site);
          if (this.result[site] > 0) {
            if (this.result[site] === 1) {
                element.setAttribute('class', 'unsufficient');
            } else {
                element.setAttribute('class', 'visited');
            }
          }
          element.innerHTML = site
                                .replace(/http(s)?:\/\//i, '')
                                .replace(/\/$/, '');
          siteElements.appendChild(element);
        }
    }
}

function Element(number) {
  this.number = number;
  this.element = document.createElement('a');
  this.site = siteManager.getSite();
  this.element.setAttribute('href', this.site);
  this.element.setAttribute('number', number);

  this.destroy = function(visited) {
    this.destoyed = true;

    if (visited) {
      var clickSound = new Audio("audio/click.wav");
      clickSound.volume = 0.3;
      clickSound.play();
    }
    siteManager.visited(this.site, !!visited);

    gameElement.removeChild(this.element);
    manager.elements.splice(manager.elements.indexOf(this), 1);
    manager.create();
  }

  var self = this;

  setTimeout(function(){
    gameElement.appendChild(self.element);
    setTimeout(function(){
      if (!self.destoyed) {
        self.destroy();
      }
    }, 1000 + (3000 * Math.random()))
  }, 200 + (150 * manager.elements.length * Math.random()))

}

function Manager() {
    this.elements = [];

    /*
      remove element and all neigboors from the map, so user dont missclick on the next one
    */
    function removeRelatives(array, choosen) {

      function left(idx) { return  idx % SIZE === 0 ? -1 : idx - 1 };
      function right(idx) { return  idx % SIZE === SIZE - 1 ? -1 : idx + 1 };

      return _.difference(array, [
        choosen, left(choosen), right(choosen),
        choosen + SIZE, left(choosen + SIZE), right(choosen + SIZE),
        choosen - SIZE, left(choosen - SIZE), right(choosen - SIZE)
      ]);
    }

    this.create = function(){
      if (this._stop) {
        return;
      }

      var possibility = _.range(0, SIZE * SIZE);

      this.elements.forEach(function(element){
        possibility = removeRelatives(possibility, element.number);
      });

      while (possibility.length != 0) {
        var pick = _.sample(possibility);
        possibility = removeRelatives(possibility, pick);
        this.elements.push(new Element(pick));
      }
    }

    this.clicked = function(number) {
      var object = _.find(this.elements, function(e){ return e.number === parseInt(number, 10)});
      if (!object) {
        console.error('click on a non existing site ' + number);
        return;
      }

      object.destroy(true);
    }

    this.stop = function(){
      this._stop = true;
    }
}


function query(cb) {
  var xhttp = new XMLHttpRequest();

  xhttp.onreadystatechange = function() {
    if (xhttp.readyState === 4 && xhttp.status === 200) {
      cb(xhttp.responseText);
    }
  }

  var langParam = urlParameter.filter(function(a){ return a[0] === 'lang'})[0];
  var lang = 'en.txt';
  if (langParam) {
    lang = langParam[1] + '.txt'
  }

  xhttp.open('GET', 'sites/' + lang, true);
  xhttp.send();
}

var manager = new Manager();
var siteManager;

query(function(sites){
  siteManager = new SiteManager(sites.split('\n').filter(function(site){return site.length > 0}));
  manager.create();
})
