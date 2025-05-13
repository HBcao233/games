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
    groups = [
      {
        row: 5,
        column: 5,
        star: 1,
        difficulty: 0,
        levels: [
          {
            layout: [
              [0, 5, 10, 15, 20],
              [1, 2],
              [3, 4, 8, 9, 13, 14],
              [6, 7, 11],
              [12, 16, 17, 18, 19, 21, 22, 23, 24],
            ],
            solution: [2, 9, 11, 18, 20],
          },
          {
            layout: [
              [0, 1, 2, 3, 4, 9, 14],
              [5, 6, 7, 8, 12, 13, 18, 19],
              [10, 11, 15, 16],
              [17, 20, 21, 22],
              [23, 24],
            ],
            solution: [1, 8, 10, 17, 24],
          },
        ],
      },
      {
        row: 6,
        column: 6,
        star: 1,
        difficulty: 0,
        levels: [
          {
            layout: [
              [0, 1],
              [2, 7, 8, 13, 19],
              [3, 4, 5, 9, 10, 11, 17],
              [6, 12, 18, 24, 25, 30, 31],
              [14, 15, 16, 20, 21, 22, 26, 27, 32, 33],
              [23, 28, 29, 34, 35],
            ],
            solution: [0, 8, 17, 21, 25, 34],
          },
        ],
      },
      {
        row: 6,
        column: 6,
        star: 1,
        difficulty: 1,
        levels: [
          {
            layout: [
              [0, 6, 12],
              [1, 2, 3, 9],
              [4, 5, 10, 11, 16, 22, 28],
              [7, 13],
              [8, 14, 15, 17, 18, 19, 20, 21, 23, 27, 29, 33, 34, 35],
              [24, 25, 26, 30, 31, 32]
            ],
            solution: [],
          }
        ],
      },
      {
        row: 8,
        column: 8,
        star: 1,
        difficulty: 0,
        levels: [
          {
            layout: [
              [0, 1, 2, 8, 9, 16, 17],
              [3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15, 18, 21, 22],
              [19, 20, 26, 27, 34, 35, 40, 41, 42, 48, 49, 50, 56, 57, 58, 59],
              [23, 28, 29, 30, 31, 36, 37, 43, 44, 51, 52, 60],
              [24, 25, 32, 33],
              [38, 39, 46, 47, 54, 61, 62],
              [45, 53],
              [55, 63]
            ],
            solution: [0, 10, 20, 25, 38, 43, 53, 63],
          }
        ],
      },
      {
        row: 8,
        column: 8,
        star: 1,
        difficulty: 1,
        levels: [
          {
            layout: [
              [0, 1, 2, 3, 8, 10, 11, 12],
              [4, 5, 9, 13, 17, 18, 19, 20, 21, 26, 34, 35, 36, 37, 38, 42, 43, 50],
              [6, 7, 14, 15, 22, 23, 27, 28, 29, 30, 31, 39, 47],
              [16, 24],
              [25, 32, 33, 40, 41, 48, 49],
              [44, 51, 52, 56, 57, 58, 59],
              [45, 46, 54, 55, 62, 63],
              [53, 60, 61],
            ],
            solution: [4, 10, 16, 31, 33, 46, 51, 61],
          }
        ],
      },
      {
        row: 10,
        column: 10,
        star: 2,
        difficulty: 0,
        levels: [
          {
            layout: [
              [0, 1, 2, 3, 4, 10, 11, 12],
              [5, 6, 7, 8, 9, 16, 17, 18, 19, 26, 27],
              [13, 14, 15, 21, 22, 23, 24, 25],
              [20, 30, 31, 32, 41, 42, 43, 51],
              [28, 29, 38, 39, 47, 48, 49, 58, 59, 68, 69],
              [33, 34, 35, 36, 37, 44, 45, 46, 52, 53, 54, 55, 56, 57, 66, 67],
              [40, 50, 60, 70, 80, 90],
              [61, 62, 63, 64, 71, 72, 73, 74, 81, 82, 83, 84, 91, 92, 93],
              [65, 75, 76, 77, 85, 86, 87, 94, 95, 96, 97],
              [78, 79, 88, 89, 98, 99],
            ],
            solution: [4, 6, 11, 18, 23, 25, 31, 39, 43, 47, 50, 55, 62, 67, 70, 79, 82, 86, 94, 98],
          },
        ],
      },
      {
        row: 10,
        column: 10,
        star: 2,
        difficulty: 1,
        levels: [
          {
            layout: [
              [0, 10, 11, 12, 20, 21, 22, 31, 32, 41, 42, 43, 44, 51, 52, 53, 61, 62, 63, 72, 73],
              [1, 2, 3, 4, 5],
              [6, 13, 14, 15, 16, 23, 24, 26, 33, 34],
              [7, 8, 9, 17, 18, 19, 29, 38, 39],
              [25, 27, 28, 35, 36, 37, 46, 47, 56, 57, 58],
              [30, 40, 50, 60],
              [45, 54, 55, 64, 65, 66, 67, 70, 71, 74, 80, 81, 82, 83, 84, 90, 91],
              [48, 49, 59, 68, 69, 79, 89, 98, 99],
              [75, 85, 86, 87, 92, 93, 94, 95, 96, 97],
              [76, 77, 78, 88],
            ],
            solution: [1, 3, 15, 17, 22, 29, 34, 37, 40, 49, 52, 56, 60, 68, 74, 76, 81, 88, 93, 95],
          }
        ],
      },
      {
        row: 14,
        column: 14,
        star: 3,
        difficulty: 0,
        levels: [
          {
            layout: [
              [0, 1, 2, 3, 4, 18],
              [5, 15, 16, 17, 19, 20, 21, 30, 31, 32, 33, 34, 45, 46, 47, 48, 49, 60, 61, 73, 74, 88, 89],
              [6, 7, 8, 22, 23, 35, 36],
              [9, 10, 11, 12, 13, 24, 25, 26, 27, 37, 38, 39, 40, 41, 53, 54, 55, 65, 66, 67, 68],
              [14, 28, 29, 42, 43, 44, 56, 57, 58, 59, 70, 71, 72, 84, 85, 86, 87, 98, 99, 100, 101, 112, 113, 127],
              [50, 51, 52, 62, 63, 64, 75, 76],
              [69, 82, 83, 96, 97, 111, 125, 139, 153, 167, 181, 195],
              [77, 78, 79, 80, 90, 91, 102, 103, 104, 118],
              [81, 92, 93, 94, 95, 105, 106, 107, 108, 119, 120, 121, 133, 134, 148, 162],
              [109, 110, 122, 123, 124, 135, 136, 137, 138, 150, 151, 152, 164, 165, 166, 178, 179, 180, 190, 191, 192, 193],
              [114, 126, 128, 140, 141, 142],
              [115, 116, 117, 129, 130, 131, 132, 143, 144, 145, 146, 147, 161],
              [132, 144, 145, 146, 147, 161],
              [149, 163, 175, 176, 177, 187, 188, 189],
              [154, 168, 171, 172, 173, 182, 183, 184, 185, 186],
              [155, 156, 157, 158, 159, 160, 169, 170],
            ],
            solution: [0, 2, 6, 18, 23, 25, 29, 35, 41, 45, 47, 52, 57, 64, 68, 73, 75, 80, 85, 92, 96, 102, 104, 108, 114, 120, 125, 126, 132, 137, 142, 144, 149, 154, 161, 166, 171, 173, 177, 189, 193, 195],
          }
        ],
      },
      {
        row: 14,
        column: 14,
        star: 3,
        difficulty: 1,
        levels: [
          {
            layout: [],
            solution: [],
          }
        ],
      },
      {
        row: 6,
        column: 6,
        star: 1,
        difficulty: 2,
        levels: [
          {
            shapeless: [0, 1, 3, 7, 10, 11, 15, 16, 22, 25, 31],
            solution: [4, 8, 17, 19, 27, 30],
          }
        ],
      },
      {
        row: 8,
        column: 8,
        star: 1,
        difficulty: 2,
        levels: [
          {
            shapeless: [1, 2, 3, 6, 17, 23, 25, 26, 27, 32, 33, 34, 35, 36, 41, 42, 49, 50, 51, 53, 54, 55],
            solution: [5, 9, 22, 28, 39, 43, 48, 58],
          }
        ],
      },
      {
        row: 10,
        column: 10,
        star: 2,
        difficulty: 2,
        levels: [
          {
            shapeless: [1, 2, 9, 11, 12, 18, 19, 29, 36, 52, 53, 59, 60, 64, 70, 71, 73, 74, 75, 79, 91, 97, 99],
            solution: [4, 8, 10, 16, 23, 28, 31, 35, 43, 49, 51, 57, 65, 69, 72, 77, 80, 84, 92, 96],
          }
        ],
      },
    ]

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
              children: tag('div', {innerText: num2letter(j) + (i+1)}),
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
            this.table.classList.toggle('show-numbers');
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