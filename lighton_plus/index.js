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
  function yieldToMain() {
    if (globalThis.scheduler?.yield) {
      return scheduler.yield();
    }

    // Fall back to yielding with setTimeout.
    return new Promise(resolve => {
      setTimeout(resolve, 0);
    });
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
    row = 3;
    column = 3;
    start_time = 0;
    ended = false;
    timer;
    index = 0;
    click_count = [];
    long = 3;
    checkpoint = null;
    checkpoints = {}

    constructor(containerSelector, row, column, long, checkpoint) {
      if (Game.instance) {
        return Game.instance;
      }
      Game.instance = this;
      
      this.container = document.querySelector(containerSelector);
      this.goals = this.container.querySelector('.goals');
      this.clicks = this.container.querySelector('.clicks');
      this.table = this.container.querySelector('.game_table');
      this.time = this.container.querySelector('.bottom_controls .time');
      this.tip = this.container.querySelector('.top_controls .tip');
      this.clickTimes = this.container.querySelector('.bottom_controls .click_times')
      this.blockLeft = this.container.querySelector('.bottom_controls .block_left');
      this.settingsBtn = this.container.querySelector('.bottom_controls .settings');
      this.settings_form = this.container.querySelector('.settings_form');
      
      if (row) this.row = parseInt(row);
      if (column) this.column = parseInt(column);
      if (long) this.long = parseInt(long);
      this.solve();
      // console.log(this.checkpoints)
      const ok = this.spawnCheckpoint(checkpoint);
      if (!ok) return;
      
      this.init();
    }
    
    spawnCheckpoint(checkpoint) {
      let arr = Object.keys(this.checkpoints)
      if (this.long > arr.length) {
        this.tip.innerText = '没有这么长的关卡'
        return false
      }
      if (!checkpoint || !isArrayLike(checkpoint)) {
        checkpoint = [];
      }
      for (let i = checkpoint.length - 1; i > 0; i--) {
        if (arr.indexOf(checkpoint[i]+'') === -1) {
          checkpoint.splice(i, 1);
        }
      }
      while (checkpoint.length < this.long) {
        let index = Math.floor(Math.random() * arr.length);
        if (checkpoint.indexOf(arr[index]) === -1) checkpoint.push(arr[index]);
      }
      this.checkpoint = checkpoint;
      return true;
    }
    
    setUrl() {
      let params = new URLSearchParams(window.location.search);
      params.set('row', this.row);
      params.set('column', this.column);
      params.set('long', this.long);
      params.set('checkpoint', this.checkpoint.join(','));
      history.replaceState({}, '', '?' + params.toString());
    }

    /**
     * 创建表格
     */
    spawnTable() {
      this.setUrl();
      
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
      const w1 = w/this.row < 30 ? 30 : w/this.row;
      for (const t of this.table.querySelectorAll('td')) {
        t.style.width = w1;
        t.style.height = w1;
        t.style.fontSize = w/this.row < 30 ? 25: 28;
      }
      
    }
    
    spawnGoal() {
      this.goals.innerHTML = '';
      this.clicks.innerHTML = '';
      for (let i = 0; i < this.checkpoint.length; i++) {
        this.goals.appendChild(tag('div', {
          class: 'goal',
          attrs: { 'data-index': i },
          innerText: this.checkpoint[i],
        }));
        this.clicks.appendChild(tag('div', {
          class: 'click' + (i == 0 ? ' playing' : ''),
          attrs: { 'data-index': i },
          innerText: '',
        }))
        this.click_count[i] = 0;
      }
    }
    
    setInit() {
      let num = this.checkpoint[this.index];
      let arr = this.checkpoints[num + ''];
      // console.log(arr)
      let r = Math.floor(Math.random() * arr.length)
      let init = arr[r];
      // console.log(init);
      let i = 0;
      this.init_opens = 0;
      let c = 10000;
      while (init != 0) {
        if (c == 0) {
          this.tip.innerText = '错误: 循环次数过多'
          return
        }
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.classList.remove('open')
        if (init % 2) {
          t.classList.add('open');
          this.init_opens++;
        }
        init = Math.floor(init / 2)
        i++;
        c--;
      }
      for (; i < this.row * this.column; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.classList.remove('open')
      }
    }
    
    /**
     * 初始化
     */
    init() {
      this.spawnTable();
      this.spawnGoal();
      
      this.setInit();
      
      this.blockLeft.innerText = this.row * this.column - this.init_opens;
      
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
          if (t.classList.contains('flag-mode')) {
            this.table.classList.toggle('flag-mode');
          }
          return;
        } 
        
        if (t.closest('.reset')) {
          this.reset();
          return;
        }
        if (t.closest('.top_controls .win')) {
          this.gameWin();
          return;
        }
        if (t.closest('.finish_controls')) {
          let flag = false;
          if (t.classList.contains('longer')) {
            this.long += 2;
          }
          if (t.classList.contains('shorter')) {
            if (this.long <= 3) {
              this.tip.innerText = '再小会没感觉的~'
              return
            }
            this.long -= 2;
          }
          // 变大按钮
          if (t.classList.contains('bigger')) {
            if (this.row >= 4 && this.column >= 4) {
              this.tip.innerText = '再大会受不了的~'
              return
            }
            if (this.row <= this.column) this.row++;
            else this.column++;
            flag = true;
          }
          if (t.classList.contains('smaller')) {
            if (this.row <= 3 && this.column <= 3) {
              this.tip.innerText = '再小也太杂鱼了吧~'
              return
            }
            if (this.column >= this.row) this.column--;
            else this.row--;
            flag = true;
          }
          if (flag) this.solve();
          const ok = this.spawnCheckpoint();
          if (!ok) return;
          this.spawnTable();
          this.spawnGoal();
          this.reset();
          this.container.querySelector('.finish_controls').classList.remove('on');
          return;
        }
        
      });
      this.table.addEventListener('click', (e) => {
        if (e.target.tagName == 'TD') {
          this.clickBlock(e.target);
        };
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
          
          this.solve();
          const ok = this.spawnCheckpoint();
          if (!ok) return;
          this.spawnTable();
          this.spawnGoal();
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
     * 点击格子
     * @param {HTMLElement} t 
     */
    clickBlock(t) {
      if (this.container.querySelector('.game_container').classList.contains('edit')) {
        t.classList.toggle('open');
        return;
      }
      if (this.table.classList.contains('flag-mode')) {
        t.classList.toggle('flag')
      }
      
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
      
      t.classList.toggle('open');
      for(const i of this.around(index)) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.classList.toggle('open')
      }
      
      if(!this.click_count[this.index]) this.click_count[this.index] = 0;
      this.click_count[this.index]++;
      this.clickTimes.innerText = this.click_count.reduce((a, i) => a + i, 0);
      this.clicks.children[this.index].innerText = this.click_count[this.index];
      
      let blockLeft = this.row * this.column;
      for (const t of this.table.querySelectorAll('td')) {
        if (t.classList.contains('open')) blockLeft--;
      }
      this.blockLeft.innerText = blockLeft;
      if (blockLeft == 0) {
        this.nextLevel();
      }
    }
    
    /**
     * 生成 checkpoints
     */
    solve() {
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
            if (j == row * column) k ^= init_matrix.get(i);
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
          const freevar_num = row * column - var_rule.length;
          let res;
          let min = row * column;
          for (let i = 0; i < (2 ** freevar_num); i++) {
            let t = new Bitmap(row * column);
            for (let j = 0; j < var_rule.length; j++) {
              let ii = i;
              let v = 0;
              let k = 0;
              while (ii != 0) {
                v ^= var_rule[j].get(k) & (ii % 2)
                t.set(var_rule.length + freevar_num - k - 1, ii % 2)
                ii = Math.floor(ii / 2)
                k++;
              }
              t.set(j, v ^ result.get(j));
            }
            // console.log(format_vector(t, row, column))
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
              // console.log('解数量:', 2 ** freevar_num);
              let result = to_result(matrix);
              // console.log('特解', format_vector(result, 2, 2))
              if (freevar_num > 10) return false;
              let var_rule = [];
              for (let j = 0; j < i; j++) {
                let t = new Bitmap(freevar_num);
                for (let k = 0; k < freevar_num; k++) {
                  t.set(k, matrix.get(j * (row * column + 1) + row * column - k - 1))
                }
                var_rule.push(t)
                // console.log(format_vector(t, 1, freevar_num))
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
      
      this.tip.innerText = '生成关卡中...';
      yieldToMain();
      let results = [];
      for (let i = 0; i < 2 ** (this.row * this.column) - 1; i++) {
        let row = this.row;
        let column = this.column;
        let init_matrix = new Bitmap(row * column);
        let j = 0;
        let ii = i;
        while (ii != 0) {
          init_matrix.set(j, ii % 2);
          ii = Math.floor(ii / 2);
          j++;
        }
        let m = gen_solve_matrix(row, column, init_matrix);
        // console.log(format_solve_matrix(m,  row, column))
        let result = gauss_elimination(m, row, column);
        // console.log(result)
        if (!result) {
          continue;
        }
        let count = count_of_1(result);
        results.push(count);
      }
      // console.log(results)
      let checkpoints = {};
      for (let i = 0; i < results.length; i++) {
        if (!checkpoints[results[i] + '']) checkpoints[results[i] + ''] = [];
        checkpoints[results[i] + ''].push(i);
      }
      // console.log(checkpoints)
      for (const [k, v] of Object.entries(checkpoints)) {
        if (v.length < 10) {
          delete checkpoints[k]
        }
      }
      // console.log(checkpoints)
      this.checkpoints = checkpoints;
      this.tip.innerText = '';
    }
    
    /**
     * 下一小关
     */
    nextLevel() {
      this.clicks.children[this.index].classList.remove('playing');
      this.clicks.children[this.index].classList.add('finish');
      if (this.index == this.checkpoint.length - 1) {
        this.gameWin();
        return
      }
      this.index++;
      this.clicks.children[this.index].classList.add('playing');
      this.setInit()
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
      let click = this.click_count.reduce((a, i) => a + i, 0)
      this.tip.innerText = '你赢啦！用时: ' + t + ' 点击: ' + click;
      this.container.querySelector('.finish_controls').classList.add('on');
      this.container.querySelector('.game_container').classList.add('win');
    }
    /**
     * 重置
     */
    reset() {
      this.index = 0
      this.tip.innerText = '';
      this.ended = false;
      clearInterval(this.timer);
      this.start_time = 0;
      this.time.innerText = '00:00';
      this.click_count = [];
      this.clickTimes.innerText = 0;
      
      this.container.querySelector('.game_container').classList.remove('win');
      
      for (const t of this.table.querySelectorAll('td')) {
        t.classList.remove('star');
        t.classList.remove('open');
      }
      this.setInit()
      this.blockLeft.innerText = this.row * this.column - this.init_opens;
      
      for (const t of this.clicks.children) {
        t.innerText = '';
        t.classList.remove('playing')
        t.classList.remove('finish')
      }
      this.clicks.children[0].classList.add('playing')
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
    let row = parseInt(params.get('row'));
    let column = parseInt(params.get('column'));
    let long = parseInt(params.get('long'));
    let checkpoint = null;
    if (params.get('checkpoint')) {
      checkpoint = params.get('checkpoint').split(',').map(i => parseInt(i))
    }
    new Game(
      '.container', 
      row, 
      column,
      long,
      checkpoint,
    );
  })
})();