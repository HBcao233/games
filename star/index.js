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
  const isMobile = () => {
    if(navigator && navigator.userAgent) return /Mobi|Android|iPhone/i.test(navigator.userAgent);
    return window.innerWidth <= 300;
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
    else if (options.innerText) newElement.innerText = options.innerText;
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
  /**
   * 每一位异或, 返回 0 或 1
   */
  const allbit_xor = (n) => {
    let res = 0;
    for (let i = 0; i < n.size; i++) {
      res ^= n.get(i);
    }
    return res;
  }
  /**
   * 计算位图中 1 的数量
   */
  const count_of_1 = (n) => {
    let count = 0;
    for (let i = 0; i < n.size; i++) {
      if (n.get(i)) count += 1;
    }
    return count;
  }

  class Game {
    static instance;
    container;
    row = 5;
    column = 5;
    stars = 5;
    start_time = 0;
    ended = false;
    timer;
    star_count = 0;
    booms = [];
    group = 1;
    level = 1;
    difficulties = ['普通', '困难', '不规则 (Shapeless)']
    groups = star_groups

    constructor(containerSelector, group, level) {
      if (Game.instance) {
        return Game.instance;
      }
      Game.instance = this;
      
      this.container = document.querySelector(containerSelector);
      this.table = this.container.querySelector('.game_table');
      this.time = this.container.querySelector('.bottom_controls .time');
      this.tip = this.container.querySelector('.top_controls .tip');
      this.winBtn = this.container.querySelector('.top_controls .win');
      this.resetBtn = this.container.querySelector('.top_controls .reset');
      this.settingsBtn = this.container.querySelector('.bottom_controls .settings');
      this.settings_form = this.container.querySelector('.settings_form');
      this.finishControls = this.container.querySelector('.finish_controls')
      
      this.initLevels();
      this.setLevel(group, level);
      this.init();
    }
    
    initLevels() {
      let wins = JSON.parse(window.localStorage.getItem('wins') || '{}');
      // console.log(wins);
      for (let i = 0; i < this.groups.length; i++) {
        let g = this.groups[i];
        this.finishControls.appendChild(tag('div', {
          class: 'group',
          children: [
            tag('span', {
              class: 'text',
              innerHTML: `${g.row}x${g.column} ${g.star}&#9733; ${this.difficulties[g.difficulty]}`
            }),
            tag('div', { 
              class: 'levels',
              children: g.levels.map((l, j) => {
                // console.log(wins[`${i+1}-${j+1}`])
                return tag('button', {
                  class: 'level btn' + (wins[`${i+1}-${j+1}`] ? ' win':''),
                  attrs: {
                    'data-group': i + 1,
                    'data-level': j + 1,
                  },
                  innerText: `${i+1}-${j+1}`,
                });
              }),
            })
          ]
        }))
      }
    }
    
    setLevel(group, level) {
      if (group) this.group = parseInt(group);
      if (level) this.level = parseInt(level);
      let params = new URLSearchParams(window.location.search);
      params.set('group', this.group);
      params.set('level', this.level);
      history.replaceState({}, '', '?' + new URLSearchParams(params).toString());
      
      let g = this.groups[this.group - 1];
      let l = this.groups[this.group - 1].levels[this.level - 1];
      if (!g || !l) {
        this.tip.innerText = '关卡不存在';
        return
      }
      let t = this.finishControls.querySelector(`.level[data-group="${this.group}"][data-level="${this.level}"]`);
      t.classList.remove('win');
      t.classList.add('playing');
      
      this.row = g.row;
      this.column = g.column;
      this.star = g.star;
      this.stars = this.star * this.row;
      this.difficulty = g.difficulty;
      this.layout = l.layout;
      this.shapeless = l.shapeless;
      this.solution = l.solution;
      
      this.container.querySelector('.difficulty').innerText = this.difficulties[this.difficulty];
      this.container.querySelector('.bottom_controls .size').innerText = this.row + 'x' + this.column;
      this.container.querySelector('.bottom_controls .star').innerText = g.star;
    }

    /**
     * 创建表格
     */
    spawnTable() {
      this.table.innerHTML = '';
      
      const num2letter = (num) => {
        let i = num % 26;
        let j = parseInt(num / 26);
        let res = String.fromCharCode(i + 65);
        if (j != 0) res = String.fromCharCode(j + 64) + res + '\n';
        return res;
      };
      for (let i = 0; i < this.row; i++) {
        this.table.appendChild(tag('tr', {
          attrs: { 'data-index': i }, 
          children: [...Array(this.column).keys()].map(j => {
            return tag('td', { class: 'cell', 
              attrs: { 'data-index': this.column * i + j },
              children: [
                tag('div', {
                  class: 'numbers',
                  innerText: num2letter(j) + (i+1),
                }),
                tag('div', {
                  class: 'numbers1',
                  innerText: i * this.column + j,
                })
              ]
            });
          })
        }))
      };
      
      const w = this.table.getBoundingClientRect().width;
      this.table.style.height = w;
      const w1 = w/this.column < 30 ? 30 : w/this.column;
      for (const t of this.table.querySelectorAll('td')) {
        t.style.width = w1;
        t.style.height = w1;
        t.style.fontSize = w/this.row < 30 ? 25: 28;
      }
      this.container.querySelector('.fake_table').style.width = w;
      this.container.querySelector('.fake_table').style.height = this.table.getBoundingClientRect().height + 10;
      
      if (this.table.getBoundingClientRect().width > this.container.querySelector('.game_container').getBoundingClientRect().width - 10) {
        this.table.style.left = '10px';
        this.table.style.right = '0';
        this.table.style.transform = 'unset';
      }
      
      if (this.difficulty == 2) {
        // 不规则
        for (let i = 0; i < this.row * this.column; i++) {
          let t = this.table.querySelector(`.cell[data-index="${i}"]`)
          if (this.shapeless.indexOf(i) !== -1) {
            t.classList.add('broken');
          }
        }
        return
      }
      // 粗边框
      let layout = this.layout;
      // console.log(layout)
      for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < layout[i].length; j++) {
          let index = layout[i][j];
          let x = index % this.column;
          let y = Math.floor(index / this.column);
          let t = this.table.querySelector(`.cell[data-index="${index}"]`)
          if (x != this.column - 1 && layout[i].indexOf(index + 1) === -1) {
            t.classList.add('bright')
          }
          if (y != this.row - 1 && layout[i].indexOf(index + this.column) === -1) {
            t.classList.add('bbottom')
          }
          
        }
      }
      
    }

    /**
     * 初始化
     */
    init() {
      this.spawnTable();
      
      // 监听按钮/滑块点击
      document.addEventListener('click', (e) => {
        const t = e.target;
        // 滑块
        if (t.classList.contains('slider')) {
          t.classList.toggle('on');
          
          if (t.classList.contains('show-numbers')) {
            this.table.classList.remove('show-numbers1');
            this.table.classList.toggle('show-numbers');
            return;
          }
          if (t.classList.contains('show-numbers1')) {
            this.table.classList.remove('show-numbers');
            this.table.classList.toggle('show-numbers1');
            return;
          }
          return;
        } 
        
        if (t.classList.contains('level')) {
          let group = parseInt(t.getAttribute('data-group'));
          let level = parseInt(t.getAttribute('data-level'));
          this.setLevel(group, level)
          this.spawnTable();
          this.reset();
          this.container.scrollTop = 0;
          return
        }
        if (t.classList.contains('next_level')) {
          let group = this.group;
          let level = this.level;
          if (level != this.groups[group - 1].levels.length) {
            level++;
          } else {
            group++;
            level = 1;
            if (!this.groups[group - 1]) {
              this.tip.innerText = '已经是最后一关了';
              this.container.scrollTop = 0;
              return
            } 
          }
          this.setLevel(group, level)
          this.spawnTable();
          this.reset();
          this.container.scrollTop = 0;
          return;
        }
        if (t.classList.contains('last_level')) {
          let group = this.group;
          let level = this.level;
          if (level != 1) {
            level--;
          } else {
            group--;
            if (!this.groups[group - 1]) {
              this.tip.innerText = '已经是第一关了';
              this.container.scrollTop = 0;
              return
            } else {
              level = this.groups[group - 1].levels.length;
            }
          }
          this.setLevel(group, level)
          this.spawnTable();
          this.reset();
          this.container.scrollTop = 0;
          return;
        }
        
      });
      this.table.addEventListener('click', (e) => {
        if (e.target.tagName == 'TD') {
          this.clickBlock(e.target);
        };
      })
      this.table.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (e.target.tagName == 'TD') {
          let t = e.target;
          if (t.classList.contains('star')) return;
          if (t.classList.contains('broken')) return;
          t.classList.toggle('not')
        };
        return false;
      })
      this.winBtn.addEventListener('click', () => {
        if (this.ended) {
          this.tip.innerText = '游戏已经胜利啦, 点击右边按钮重置';
          return;
        }
        this.gameWin();
      });
      this.resetBtn.addEventListener('click', () => {
        this.reset();
      })
      this.settingsBtn.addEventListener('click', () => {
        this.settings_form.classList.toggle('on');
        if (this.settings_form.classList.contains('on')) this.finishControls.classList.add('on');
        else this.finishControls.classList.remove('on');
      })
      
    }
    /**
     * 同行序号
     */
    same_row(index) {
      index = parseInt(index);
      let res = [];
      let i = Math.floor(index / this.column);
      let j = index % this.column;
      for (let k = 0; k < this.column; k++) {
        if (k == j) continue;
        res.push(i * this.column + k)
      }
      return res;
    }
    /**
     * 同列序号
     */
    same_column(index) {
      index = parseInt(index);
      let res = [];
      let i = Math.floor(index / this.column);
      let j = index % this.column;
      for (let k = 0; k < this.row; k++) {
        if (k == i) continue;
        res.push(k * this.column + j)
      }
      return res;
    }
    /**
     * 获取 索引位置周围及同行同列的索引数组
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
      // 同行
      for (let k = 0; k < this.column; k++) {
        if (
          res.indexOf(i * this.column + k) === -1 && 
          i * this.column + k != index
        ) res.push(i * this.column + k)
      }
      // 同列
      for (let k = 0; k < this.row; k++) {
        if (res.indexOf(k * this.column + j) === -1 && k * this.column + j != index) res.push(k * this.column + j)
      }
      return res;
    }
    /**
     * 返回单元格宫序号
     */
    palace_index(index) {
      let palace = 0;
      for (let i = 1; i < this.layout.length; i++) {
        if (this.layout[i].indexOf(index) !== -1) {
          palace = i;
          break;
        }
      }
      return palace;
    }
    /**
     * 返回同宫序号数组
     */
    same_palace(index) {
      let palace = this.palace_index(index);
      let res = [...this.layout[palace]];
      res.splice(res.indexOf(index), 1);
      return res;
    }
    /**
     * 返回同行同列、同宫序号数组
     */
    arounds(index) {
      return this.difficulty == 2 ? this.around(index) : [...new Set(
        this.around(index).concat(this.same_palace(index))
      )];
    }
    /**
     * 索引处星星是否无效
     */
    is_boom(index) {
      index = parseInt(index);
      let res = [];
      let i = Math.floor(index / this.column);
      let j = index % this.column;
      let t;
      // 斜角
      if (i != 0) {
         t = this.table.querySelector(`td[data-index="${index - this.column}"]`);
        if (t.classList.contains('star')) return true;
        if (j != 0) {
          t = this.table.querySelector(`td[data-index="${index - this.column - 1}"]`);
          if (t.classList.contains('star')) return true;
        }
        if (j != this.column - 1) {
          t = this.table.querySelector(`td[data-index="${index - this.column + 1}"]`);
          if (t.classList.contains('star')) return true;
        }
      }
      if (i != this.row - 1) {
         t = this.table.querySelector(`td[data-index="${index + this.column}"]`);
          if (t.classList.contains('star')) return true;
        if (j != 0) {
          t = this.table.querySelector(`td[data-index="${index + this.column - 1}"]`);
          if (t.classList.contains('star')) return true;
        }
        if (j != this.column - 1) {
          t = this.table.querySelector(`td[data-index="${index + this.column + 1}"]`);
          if (t.classList.contains('star')) return true;
        }
      }
      if (j != 0) {
        t = this.table.querySelector(`td[data-index="${index - 1}"]`);
        if (t.classList.contains('star')) return true;
      }
      if (j != this.column - 1) {
        t = this.table.querySelector(`td[data-index="${index + 1}"]`);
        if (t.classList.contains('star')) return true;
      }
      // 同行
      let stars = 1;
      for (const k of this.same_row(index)) {
        if (k == j) continue;
        t = this.table.querySelector(`td[data-index="${k}"]`);
        if (t.classList.contains('star')) stars++;
        if (stars > this.star) return true;
      }
      // 同列
      stars = 1;
      for (const k of this.same_column(index)) {
        if (k == i) continue;
        t = this.table.querySelector(`td[data-index="${k}"]`);
        if (t.classList.contains('star')) stars++;
        if (stars > this.star) return true;
      }
      if (this.difficulty != 2) {
        stars = 1;
        for (const k of this.same_palace(index)) {
          t = this.table.querySelector(`td[data-index="${k}"]`);
          if (t.classList.contains('star')) stars++;
          if (stars > this.star) return true;
        }
      }
      return false;
    }
    
    is_star(index) {
      index = parseInt(index);
      let i = Math.floor(index / this.column);
      let j = index % this.column;
      let res = [false, false, false];
      let t;
      // 同行
      let stars = 1;
      for (const k of this.same_row(index)) {
        if (k == j) continue;
        t = this.table.querySelector(`td[data-index="${k}"]`);
        if (t.classList.contains('star')) stars++;
        if (stars >= this.star) {
          res[0] = true;
          break;
        }
      }
      // 同列
      stars = 1;
      for (const k of this.same_column(index)) {
        if (k == i) continue;
        t = this.table.querySelector(`td[data-index="${k}"]`);
        if (t.classList.contains('star')) stars++;
        if (stars >= this.star) {
          res[1] = true;
          break;
        } 
      }
      if (this.difficulty != 2) {
        stars = 1;
        for (const k of this.same_palace(index)) {
          t = this.table.querySelector(`td[data-index="${k}"]`);
          if (t.classList.contains('star')) stars++;
          if (stars >= this.star) {
            res[2] = true;
            break;
          }
        }
      }
      return res;
    }
    
    /**
     * 点击格子
     * @param {HTMLElement} t 
     */
    clickBlock(t) {
      if (t.classList.contains('not')) return;
      if (t.classList.contains('broken')) return;
      if (this.ended) {
        return;
      }
      if (this.start_time == 0) {
        this.start_time = (new Date()).getTime();
        this.time.innerText = '00:00';
        this.timer = setInterval(() => {
          this.time.innerText = formatTime(Math.floor(((new Date()).getTime() - this.start_time) / 1000));
        }, 1000);
      }
      
      let index = parseInt(t.getAttribute('data-index'));
      let block = this.table.querySelector(`td[data-index="${index}"]`);
      if (block.classList.contains('star')) {
        // 去掉星星
        block.classList.remove('open');
        block.classList.remove('boom');
        for (const i of this.arounds(index)) {
          let t = this.table.querySelector(`td[data-index="${i}"]`);
          t.classList.remove('open')
        }
      }
      block.classList.toggle('star');
      /*
      if (this.solution.indexOf(index) !== -1) {
        if (star) this.star_count++;
        this.star_count--;
      }
      */
      let star_count = 0;
      for (let i = 0; i < this.row * this.column; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        if (!t.classList.contains('star')) continue;
        let boom = this.is_boom(i);
        if (boom) {
          t.classList.add('boom');
            t.classList.remove('open');
          for (const k of this.arounds(i)) {
            let tk = this.table.querySelector(`td[data-index="${k}"]`);
            tk.classList.remove('open');
          }
        } else {
          star_count++;
          t.classList.remove('boom')
          let is_star = this.is_star(i);
          if (is_star[0]) {
            t.classList.add('open');
            for (const k of this.same_row(i)) {
              let tk = this.table.querySelector(`td[data-index="${k}"]`);
              tk.classList.add('open');
            }
          }
          if (is_star[1]) {
            t.classList.add('open');
            for (const k of this.same_column(i)) {
              let tk = this.table.querySelector(`td[data-index="${k}"]`);
              tk.classList.add('open');
            }
          }
          // console.log(is_star)
          if (is_star[2] && this.difficulty != 2) {
            t.classList.add('open');
            for (const k of this.same_palace(i)) {
              let tk = this.table.querySelector(`td[data-index="${k}"]`);
              tk.classList.add('open');
            }
          }
          
        }
      } 
      this.star_count = star_count;
      
      this.tip.innerText = this.star_count;
      if (this.star_count == this.stars) {
        this.gameWin();
      }
    }
    
    /**
     * 游戏胜利
     */
    gameWin() {
      this.ended = true;
      clearInterval(this.timer);
      
      let time = this.start_time != 0 ? (new Date()).getTime() - this.start_time : 0;
      let ms = time % 1000;
      if (ms < 10) ms = '00' + ms
      else if (ms < 100) ms = '0' + ms
      let t = formatTime(Math.floor(time / 1000)) + '.' + ms; 
      this.tip.innerText = '你赢啦！用时: ' + t;
      this.container.querySelector('.finish_controls').classList.add('on');
      this.container.querySelector('.game_container').classList.add('win');
      
      for (let i = 0; i < this.row * this.column; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.classList.add('open');
        if (this.solution &&this.solution.indexOf(i) !== -1) {
          t.classList.add('star')
        }
      }
      
      let l = this.finishControls.querySelector(`.level[data-group="${this.group}"][data-level="${this.level}"]`);
      l.classList.add('win');
      l.classList.remove('playing')
      let wins = JSON.parse(window.localStorage.getItem('wins') || '{}');
      wins[`${this.group}-${this.level}`] = true;
      // console.log(wins)
      window.localStorage.setItem('wins', JSON.stringify(wins))
    }
    /**
     * 重置
     */
    reset() {
      this.tip.innerText = '';
      this.ended = false;
      clearInterval(this.timer);
      this.start_time = 0;
      this.time.innerText = '00:00';
      this.star_count = 0;
      this.container.querySelector('.game_container').classList.remove('win');
      
      for (const t of this.table.querySelectorAll('td')) {
        t.classList.remove('open');
        t.classList.remove('star');
        t.classList.remove('boom');
      }
    }
  }
  
  window.addEventListener('resize', () => {
    if (isMobile()) document.body.classList.add('mobile')
    else document.body.classList.remove('mobile')
  });
    
  window.addEventListener('load', () => {
    if (isMobile()) document.body.classList.add('mobile')
    else document.body.classList.remove('mobile')
    
    let params = new URLSearchParams(window.location.search);
    new Game(
      '.container', 
      parseInt(params.get('group')), 
      parseInt(params.get('level')), 
    );
  })
})();