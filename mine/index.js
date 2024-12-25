(function () {
  const isNumber = s => Object.prototype.toString.call(s) === "[object Number]";
  const isString = s => Object.prototype.toString.call(s) === "[object String]";
  const isArrayLike = s => s != null && typeof s[Symbol.iterator] === 'function';
  const formatTime = t => {
    let s = Math.floor(t % 60);
    if (s < 10) s = '0' + s;
    let m = Math.floor(t / 60 % 60);
    if (m < 10) m = '0' + m;
    let h = Math.floor(t / 3600);
    if (h < 10) h = '0' + h;
    if (h > 0) return h + ':' + m + ':' + s;
    return m + ':' + s;
  }

  /**
   * 创建 Element
   * @param {String} tagName 
   * @param {Object} options 
   * @param {function} func 
   * @returns {SVGElement | HTMLElement}
   */
  function tag(tagName, options, func) {
    options = options || {};
    var svgTags = ['svg', 'g', 'path', 'filter', 'animate', 'marker', 'line', 'polyline', 'rect', 'circle', 'ellipse', 'polygon'];
    let newElement;
    if (svgTags.indexOf(tagName) >= 0) {
      newElement = document.createElementNS("http://www.w3.org/2000/svg", tagName);
    } else {
      newElement = document.createElement(tagName);
    }
    if (options.id) newElement.id = options.id;
    if (options.class) {
      if (!Array.isArray(options.class)) options.class = options.class.split(' ');
      for (const e of options.class) {
        if (e) newElement.classList.add(e);
      }
    }
    if (options.innerHTML) newElement.innerHTML = options.innerHTML;
    if (options.children) {
      if (!isArrayLike(options.children)) options.children = [options.children];
      for (const e of options.children) {
        if (isString(e) || isNumber(e)) e = document.createTextNode(e);
        newElement.appendChild(e);
      }
    }
    if (options.style) newElement.style.cssText = options.style
    if (options.attrs) {
      for (const [k, v] of Object.entries(options.attrs)) {
        newElement.setAttribute(k, v)
      }
    }
    func && func(newElement)
    return newElement;
  }

  /**
   * 1 维位图
   * @param {Number} size 
   * @constructor
   */
  class Bitmap {
    #size;
    #buf;
    #bin;
    constructor(size) {
      this.#size = size;
      this.#buf = new ArrayBuffer((this.#size >> 3) + 1);
      this.#bin = new Uint8Array(this.#buf);
    }
    /**
     * 获取 索引位置 1/0
     * @param {Number} i 
     * @returns {Number} 1/0
     */
    get(i) {
      if (i < 0 || i >= this.#size) return 0;
      return (this.#bin[i >> 3] >> (i % 8)) & 1;
    }
    /**
     * 设置 索引位置 1/0
     * @param {Number} i 
     * @param {Bool} c
     */
    set(i, c) {
      let row = i >> 3;
      let col = i % 8;
      let bit = 1 << col;
      if (c) {
        this.#bin[row] |= bit;
      } else {
        bit = 255 ^ bit;
        this.#bin[row] &= bit;
      }
    }
    /**
     * 填充位图
     * @param {Bool} c 
     */
    fill(c) {
      for (let i = 0; i < (this.#size >> 3) + 1; i++) {
        this.#bin[i] = c ? 255 : 0;
      }
    }
    /**
     * 大小
     * @returns {Number}
     * @getter
     */
    get size() {
      return this.#size
    }
  }

  class Game {
    static instance;
    container;
    row = 9;
    column = 9;
    mineCount = 10;
    start_time = 0;
    ended = false;
    timer;
    opened_count = 0;
    flag_count = 0;

    constructor(containerSelector, row, column, mineCount) {
      if (Game.instance) {
        return Game.instance;
      }
      Game.instance = this;
      this.container = document.querySelector(containerSelector);
      this.table = this.container.querySelector('.game_table');
      this.time = this.container.querySelector('.bottom_controls .time');
      this.mineLeft = this.container.querySelector('.bottom_controls .mine_left');
      this.tip = this.container.querySelector('.top_controls .tip');
      this.winBtn = this.container.querySelector('.top_controls .win');
      this.resetBtn = this.container.querySelector('.top_controls .reset');
      this.settingsBtn = this.container.querySelector('.bottom_controls .settings');
      this.settings_form = this.container.querySelector('.settings_form');
      if (row) this.row = row;
      if (column) this.column = column;
      if (mineCount) {
        if (mineCount >= this.row * this.column) mineCount = this.row * this.column - 1;
        this.mineCount = mineCount;
      }
      this.mines = new Bitmap(this.row * this.column);
      this.init();
    }

    /**
     * 创建表格
     */
    spawnTable() {
      history.replaceState({}, '', '?' + new URLSearchParams({
        row: this.row,
        column: this.column,
        mine: this.mineCount,
      }).toString());
      this.settings_form.querySelector('[name="row"]').value = this.row;
      this.settings_form.querySelector('[name="column"]').value = this.column;
      this.settings_form.querySelector('[name="mine"]').value = this.mineCount;
      this.table.innerHTML = '';
      let w = this.column * 24;
      let h = this.row * 24;
      if (w < 450) w = 450;
      if (h < 450) h = 450;
      let tdw = Math.max(w / this.column, h / this.row);
      this.table.style.width = w + 'px';
      this.table.style.height = h + 'px';
      let fontSize = 30 - Math.floor(Math.max(this.row, this.column) / 2);
      if (fontSize < 17) fontSize = 17;
      for (let i = 0; i < this.row; i++) {
        this.table.appendChild(tag('tr', {
          attrs: { 'data-index': i }, children: [...Array(this.column).keys()].map(j => {
            return tag('td', { class: 'cell', style: `width: ${tdw};height: ${tdw}px; font-size: ${fontSize}px`, attrs: { 'data-index': this.column * i + j } });
          })
        }))
      }
    }

    /**
     * 初始化
     */
    init() {
      this.mineLeft.innerText = this.mineCount;
      this.spawnTable();

      this.table.addEventListener('click', (e) => {
        if (e.target.tagName == 'TD') {
          this.mine(e.target);
        };
      })
      this.table.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.tagName == 'TD') {
          this.flag(e.target);
        };
        return false;
      })
      this.winBtn.addEventListener('click', () => {
        if (this.start_time == 0) {
          this.tip.innerText = '游戏还未开始啦, 请先点开一格格子开始游戏';
          return;
        }
        this.gameWin();
      });
      this.resetBtn.addEventListener('click', () => {
        if (this.start_time == 0) {
          this.tip.innerText = '游戏还未开始啦, 请先点开一格格子开始游戏';
          return;
        }
        this.reset();
      })
      this.settingsBtn.addEventListener('click', () => {
        this.settings_form.classList.toggle('on');
      })
      this.settings_form.addEventListener('click', (e) => {
        let r = this.settings_form.querySelector('[name="row"]');
        let c = this.settings_form.querySelector('[name="column"]');
        let m = this.settings_form.querySelector('[name="mine"]');
        if (e.target.closest('button.difficulty')) {
          switch (e.target.value) {
            case '0':
              r.value = 9;
              c.value = 9;
              m.value = 10;
              break;
            case '1':
              r.value = 16;
              c.value = 16;
              m.value = 40;
              break;
            case '2':
              r.value = 16;
              c.value = 30;
              m.value = 100;
              break;
            case '3':
              r.value = 25;
              c.value = 60;
              m.value = 309;
              break;
          }
          return;
        }
      })
    }
    /**
     * 生成地雷
     * @param {Number} index 
     */
    spawnMine(index) {
      let count = 0;
      let flag = this.mineCount > this.row * this.column * 0.5;
      while (count < this.mineCount) {
        let i = Math.floor(Math.random() * this.row * this.column);
        if ((flag || i != index) && this.mines.get(i) == 0) {
          this.mines.set(i, 1);
          count++;
        }
      }
      // for (let i = 0; i < this.row * this.column; i++) {
      //   if (this.mines.get(i)) this.table.querySelector(`td[data-index="${i}"]`).innerText = '★';
      // }
    }
    /**
     * 获取 索引位置周围位置的索引数组
     * @param {Number} index 
     * @returns {Array}
     */
    around(index) {
      index = parseInt(index);
      let res = [];
      let i = Math.floor(index / this.column);
      let j = index % this.column;
      if (i != 0) {
        res.push(index - this.column);
        if (j != 0) res.push(index - this.column - 1);
        if (j != this.column - 1) res.push(index - this.column + 1);
      }
      if (i != this.row - 1) {
        res.push(index + this.column);
        if (j != 0) res.push(index + this.column - 1);
        if (j != this.column - 1) res.push(index + this.column + 1);
      }
      if (j != 0) res.push(index - 1);
      if (j != this.column - 1) res.push(index + 1);
      return res;
    }
    /**
     * 计算索引位置周围的地雷个数
     * @param {Number} index 
     * @returns {Number}
     */
    countAround(index) {
      index = parseInt(index);
      return this.around(index).map(i => this.mines.get(i)).reduce((sum, i) => sum + i, 0);
    }
    /**
     * 打开周围所有 周围地雷个数为 0 的格子
     * @param {Number} index 
     */
    mineAllZero(index) {
      for (const i of this.around(index)) {
        if (i < 0 || i >= this.row * this.column) continue;
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        if (t.classList.contains('open')) continue;
        let c = this.countAround(i);
        this.openBlock(t);
        if (c == 0) {
          if (!t.checked) {
            t.checked = true;
            this.mineAllZero(i);
          }
        } else {
          t.innerText = c;
        }
      }
    }
    /**
     * 打开格子
     * @param {HTMLElement} t 
     */
    openBlock(t) {
      if (t.classList.contains('open')) return;
      t.classList.add('open');
      this.opened_count++;
      if (this.opened_count >= this.row * this.column - this.mineCount) {
        this.gameWin();
      }
    }
    /**
     * 尝试排雷
     * @param {HTMLElement} t 
     */
    mine(t) {
      let index = parseInt(t.getAttribute('data-index'));
      if (this.ended) {
        return;
      }
      if (t.classList.contains('flag')) return;
      if (this.start_time == 0) {
        this.spawnMine(index);
        this.start_time = (new Date()).getTime();
        this.time.innerText = '00:00';
        this.timer = setInterval(() => {
          this.time.innerText = formatTime(Math.floor(((new Date()).getTime() - this.start_time) / 1000));
        }, 1000);
      }
      if (this.mines.get(index)) {
        this.gameOver();
        t.classList.add('boom');
        return;
      }
      let count = this.countAround(index)
      if (count == 0) this.mineAllZero(index);
      else t.innerText = count;
      this.openBlock(t);
    }
    /**
     * 尝试插旗
     * @param {HTMLElement} t 
     */
    flag(t) {
      if (this.ended) {
        return;
      }
      if (this.start_time == 0) {
        this.tip.innerText = '游戏还未开始啦, 请先点开一格格子开始游戏';
        return;
      }
      if (t.classList.contains('open')) return;
      let c = parseInt(this.mineLeft.innerText);
      if (!t.classList.contains('flag')) {
        let index = parseInt(t.getAttribute('data-index'));
        if (this.mines.get(index)) this.flag_count++;
        if (c == 1) {
          if (this.flag_count >= this.mineCount) {
            return this.gameWin();
          } else {
            this.tip.innerText = '杂鱼~这样乱插旗子是没用的~';
          }
        }
        t.classList.add('flag')
        this.mineLeft.innerText = c - 1;
      } else {
        t.classList.remove('flag')
        this.mineLeft.innerText = c + 1;
      }
    }
    /**
     * 游戏结束
     * @param {Bool} win 
     */
    gameEnd(win) {
      this.ended = true;
      clearInterval(this.timer);
      for (let i = 0; i < this.row * this.column; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        if (win) t.classList.add('open');
        if (this.mines.get(i)) {
          t.classList.add('star');
        } else {
          t.classList.remove('star');
        }
      }
    }
    /**
     * 游戏失败
     */
    gameOver() {
      this.gameEnd();
      this.tip.innerText = '杂鱼~这就不行了？';
    }
    /**
     * 游戏胜利
     */
    gameWin() {
      this.mineLeft.innerText = 0;
      this.gameEnd(1);
      this.tip.innerText = '你赢啦！';
    }
    /**
     * 重置
     */
    reset() {
      this.tip.innerText = '';
      this.ended = false;
      clearInterval(this.timer);
      this.start_time = 0;
      this.opened_count = 0;
      this.mineLeft.innerText = this.mineCount;
      this.mines.fill(0);
      for (let i = 0; i < this.row * this.column; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.innerText = '';
        t.checked = false;
        t.classList.remove('open');
        t.classList.remove('star');
        t.classList.remove('flag');
        t.classList.remove('boom');
      }
    }
  }
  window.addEventListener('load', () => {
    let params = new URLSearchParams(window.location.search);
    new Game('.game_container', parseInt(params.get('row')), parseInt(params.get('column')), parseInt(params.get('mine')));
  })
})();