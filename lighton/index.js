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

  class Game {
    static instance;
    container;
    row = 2;
    column = 2;
    start_time = 0;
    ended = false;
    timer;
    opened_count = 0;

    constructor(containerSelector, row, column) {
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
      this.blockLeft = this.container.querySelector('.bottom_controls .block_left');
      this.settingsBtn = this.container.querySelector('.bottom_controls .settings');
      this.settings_form = this.container.querySelector('.settings_form');
      if (row) this.row = row;
      if (column) this.column = column;
      this.init();
    }

    /**
     * 创建表格
     */
    spawnTable() {
      history.replaceState({}, '', '?' + new URLSearchParams({
        row: this.row,
        column: this.column,
      }).toString());
      this.settings_form.querySelector('[name="row"]').value = this.row;
      this.settings_form.querySelector('[name="column"]').value = this.column;
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
      this.table.querySelectorAll('td').forEach(t => {
        const w1 = w/this.row < 30 ? 30 : w/this.row;
        t.style.width = w1;
        t.style.height = w1;
        t.style.fontSize = w/this.row < 30 ? 25: 28;
      })
      
    }

    /**
     * 初始化
     */
    init() {
      this.blockLeft.innerText = this.row * this.column;
      this.spawnTable();
      
      // 监听按钮/滑块点击
      document.addEventListener('click', (e) => {
        const t = e.target;
        if (t.classList.contains('slider')) {
          t.classList.toggle('on');
          
          if (t.classList.contains('show-numbers')) {
            this.table.classList.toggle('show-numbers');
          }
          
        } else if (t.classList.contains('bigger')) {
          if (this.row <= this.column) {
            this.row++;
          } else {
            this.column++;
          }
          this.spawnTable();
          this.reset();
          this.container.querySelector('.bigger_wapper').classList.remove('on');
        }
      });
      this.table.addEventListener('click', (e) => {
        if (e.target.tagName == 'TD') {
          this.clickBlock(e.target);
        };
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
      })
      let r = this.settings_form.querySelector('[name="row"]');
      let c = this.settings_form.querySelector('[name="column"]');
      this.settings_form.addEventListener('click', (e) => {
        if (e.target.closest('button.difficulty')) {
          switch (e.target.value) {
            case '0':
              r.value = 2;
              c.value = 2;
              break;
            case '1':
              r.value = 3;
              c.value = 3;
              break;
            case '2':
              r.value = 4;
              c.value = 4;
              break;
            case '3':
              r.value = 5;
              c.value = 5;
              break;
          }
          return;
        } else if (e.target.closest('button.ok')) {
          let row = parseInt(r.value);
          let column = parseInt(c.value)
          this.row = row;
          this.column = column;
          this.spawnTable();
          this.reset();
        }
      })
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
      }
      if (i != this.row - 1) {
        res.push(index + this.column);
      }
      if (j != 0) res.push(index - 1);
      if (j != this.column - 1) res.push(index + 1);
      return res;
    }
    /**
     * 逻辑打开格子
     * @param {HTMLElement} t 
     */
    openBlock(t) {
      if (t.classList.contains('open')) return;
      t.classList.add('open');
      this.opened_count++;
    }
    /**
     * 逻辑关闭格子
     * @param {HTMLElement} t 
     */
    closeBlock(t) {
      if (!t.classList.contains('open')) return;
      t.classList.remove('open');
      this.opened_count--;
    }
    /**
     * 逻辑切换格子状态
     * @param {HTMLElement} t 
     */
    toggleBlock(t){
      if (t.classList.contains('open')) this.closeBlock(t);
      else this.openBlock(t);
    }
    /**
     * 点击格子
     * @param {HTMLElement} t 
     */
    clickBlock(t) {
      let index = parseInt(t.getAttribute('data-index'));
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
      
      if (t.classList.contains('star')) {
        t.classList.toggle('boom')
      }
      
      this.toggleBlock(t);
      this.around(index).map(i => {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        this.toggleBlock(t);
      }) 
      this.blockLeft.innerText = this.row * this.column - this.opened_count;
      if (this.opened_count >= this.row * this.column) {
        this.gameWin();
      }
    }
    
    /**
     * 求解点灯游戏
     */
    solve() {
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
      /**
       * 生成求解矩阵
       */
      const gen_solve_matrix = (row, column, init_matrix) => {
        if (!init_matrix) init_matrix = new Bitmap(row * column)
        let matrix = new Bitmap(row * column * (row * column + 1) );
        for (let i = 0; i < row * column; i++) {
          for (let j = 0; j < row * column + 1; j++) {
            let k = 0;
            if (j == row * column) k = 1;
            if (
              [i - column, i - 1, i, i + 1, i + column, row * column].indexOf(j) !== -1
              && (i % column != 0 || j != i - 1)
              && (i % column != column - 1 || j != i + 1)
            ) {
              k = 1;
            }
            if (j != row * column) k ^= init_matrix.get(j);
            matrix.set(i * (row * column + 1) + j, k);
          }
        }
        return matrix;
      }
      const format_vector = (vector, row, column) => {
        let res = '';
        for (let i = 0; i < row; i++) {
          if (i != 0) res += '\n';
          for (let j = 0; j < column; j++) {
            if (j != 0) res += ' ';
            res += vector.get(i * column + j);
          }
        }
        return res;
      }
      /**
       * 格式化求解矩阵
       */
      const format_solve_matrix = (matrix, row, column) => {
        let res = '';
        for (let i = 0; i < row * column; i++) {
          if (i != 0) res += '\n';
          for (let j = 0; j < row * column + 1; j++) {
            let k = matrix.get(i * (row * column + 1) + j);
            if (j != row * column) res += ' ';
            else res += ' | '
            res += k + '';
          }
        }
        return res;
      }
      /**
       * 高斯消元法求解
       */
      const gauss_elimination = (matrix, row, column) => {
        /**
         * 返回结果. 遍历高斯矩阵每一行的最后一列即为结果
         */
        const to_result = (matrix) => {
          let res = new Bitmap(row*column)
          for (let i = 0; i < row * column; i++) {
            res.set(i, matrix.get(i * (row * column + 1) + row * column));
          }
          return res;
        }
        /**
         * 寻找最优解
         */
        const find_optimal_solution = (result, var_rule) => {
          const freevar_num = row - var_rule.length;
          let res;
          let min = row * column;
          for (let i = 0; i < 2 ** freevar_num; i++) {
            let t = new Bitmap(var_rule.length);
            for (let j = 0; j < var_rule.length; j++) {
              t.set(j, allbit_xor(var_rule[j].get(i)) ^ (result.get(j) & 1));
              t.set(var_rule.length, i);
            }
            let m = count_of_1(t);
            if (m < min) {
              min = m;
              res = t;
            }
          }
          return res;
        }
        
        for(let i = 0; i < row * column; i++) {
          let cursor = i;
          while (cursor < row * column && !matrix.get(cursor * (row * column + 1) + i)) cursor++;
          // console.log(cursor)
          if (cursor == row * column) {
            // console.log(format_solve_matrix(matrix, row, column))
            // 多解时返回一个解
            if (!matrix.get(i * (row * column + 1) + row * column)) {
              const freevar_num = row * column - i;
              console.log('解数量:', 2 ** freevar_num);
              let result = to_result(matrix);
              console.log(format_vector(result, 2, 2))
              if (freevar_num > 10) return result;
              let var_rule = [];
              for (let j = 0; j < i; j++) {
                let t = new Bitmap(freevar_num);
                for (let k = 0; k < freevar_num; k++) {
                  t.set(k, matrix.get(j * (row + column + 1) + row - k - 1) & 1)
                }
                var_rule.push(t)
              }
              return find_optimal_solution(result, var_rule)
            }
            return false;
          }
          if (cursor != i) {
            // 交换两列
            for (let j = 0; j < row * column + 1; j++) {
              const t = matrix.get(i * (row * column + 1) + j);
              matrix.set(
                i * (row * column + 1) + j, 
                matrix.get(cursor * (row * column + 1) + j)
              );
              matrix.set(cursor * (row * column + 1) + j, t);
            }
          }
          // 消元
          for (let j = 0; j < row * column; j++) {
            if ((i != j) && matrix.get(j * (row * column + 1) + i)) {
              for (let k = 0; k < row * column + 1; k++) matrix.set(
                j * (row * column + 1) + k, 
                matrix.get(j * (row * column + 1) + k) ^ matrix.get(i * (row * column + 1) + k)
              )
            }
          }
          // console.log(format_solve_matrix(matrix, row, column))
        }
        return to_result(matrix)
      }
      
      
      let row = this.row;
      let column = this.column;
      let m = gen_solve_matrix(row, column);
      // console.log(format_solve_matrix(m,  row, column))
      let res = gauss_elimination(m, row, column);
      // console.log(format_vector(res, row, column));
      
      for (let i = 0; i < this.row * this.column; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.classList.add('open');
        if (res.get(i)) {
          t.classList.add('star')
        }
      }
    }
    /**
     * 游戏胜利
     */
    gameWin() {
      this.blockLeft.innerText = 0;
      this.ended = true;
      clearInterval(this.timer);
      
      let time = this.start_time != 0 ? (new Date()).getTime() - this.start_time : 0;
      let ms = time % 1000;
      if (ms < 10) ms = '00' + ms
      else if (ms < 100) ms = '0' + ms
      let t = formatTime(Math.floor(time / 1000)) + '.' + ms; 
      this.tip.innerText = '你赢啦！用时: ' + t;
      this.container.querySelector('.bigger_wapper').classList.add('on');
      
      this.solve();
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
      this.time.innerText = '00:00';
      this.blockLeft.innerText = this.row * this.column;
      
      for (let i = 0; i < this.row * this.column; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.classList.remove('open');
      }
    }
  }
  
  window.addEventListener('load', () => {
    let params = new URLSearchParams(window.location.search);
    new Game(
      '.container', 
      parseInt(params.get('row')), 
      parseInt(params.get('column')),
    );
  })
})();