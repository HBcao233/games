(function () {
  window['$'] = document.querySelector.bind(document);
  window['$$'] = document.querySelectorAll.bind(document);
  const getValue = (k) => {
    return window.localStorage.getItem(k);
  }
  const setValue = (k, v) => {
    window.localStorage.setItem(k, v);
  }
  
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

  const MAX_ATTEMPTS = 10000;
  /**
   * 星星迷题区域生成器类
   */
  class StarPuzzleRegionGenerator {
    /**
     * 构造函数
     * @param {Function} seed - 随机数生成器
     * @param {Array<Array<number>>} solution - 解决方案矩阵
     * @param {number} size - 棋盘大小
     * @param {number} n - 每行/列/区域的星星数量
     * @param {number} minCellsNum - 每个区域最小格子数
     */
    constructor(seed, solution, size, n, minCellsNum) {
      this.seed = seed;
      this.solution = solution;
      this.size = size || 5;
      this.n = n || 1;
      this.minCellsNum = minCellsNum || 2;
      this.regions = [];
    }

    /**
     * 生成区域
     * @returns {Array<Array<Array<number>>>} 区域数组，每个区域包含格子坐标
     */
    generate() {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const regions = this.tryGenerateRegions();
        if (regions && this.verifyUniqueSolution(regions)) {
          console.log(attempt)
          return this.sortRegionsBySize(regions);
        }
      }
      throw new Error('无法生成有效的区域方案');
    }

    /**
     * 尝试生成区域
     * @returns {Array<Array<Array<number>>>|null} 区域数组或null
     */
    tryGenerateRegions() {
      const visited = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
      const regions = [];
      const starPositions = this.getStarPositions();
      
      // 首先为每个星星创建一个区域
      for (const [row, col] of starPositions) {
        const region = [[row, col]];
        visited[row][col] = true;
        regions.push(region);
      }

      // 扩展区域直到所有格子都被分配
      for (let i = 0; i < this.size; i++) {
        for (let j = 0; j < this.size; j++) {
          if (!visited[i][j]) {
            const regionIndex = this.findNearestRegion(i, j, regions, visited);
            if (regionIndex !== -1) {
              regions[regionIndex].push([i, j]);
              visited[i][j] = true;
            }
          }
        }
      }

      // 验证每个区域的大小
      for (const region of regions) {
        if (region.length < this.minCellsNum) {
          throw new Error('错误代码逻辑')
        }
      }

      // 验证连通性
      for (const region of regions) {
        if (!this.isConnected(region)) {
          throw new Error('错误代码逻辑')
        }
      }

      return regions;
    }

    /**
     * 获取星星位置
     * @returns {Array<Array<number>>} 星星位置数组
     */
    getStarPositions() {
      const positions = [];
      for (let i = 0; i < this.size; i++) {
        for (let j = 0; j < this.size; j++) {
          if (this.solution[i][j] === 1) {
            positions.push([i, j]);
          }
        }
      }
      return positions;
    }

    /**
     * 找到最近的区域
     * @param {number} row - 行
     * @param {number} col - 列
     * @param {Array<Array<Array<number>>>} regions - 区域数组
     * @param {Array<Array<boolean>>} visited - 访问标记
     * @returns {number} 区域索引或-1
     */
    findNearestRegion(row, col, regions, visited) {
      let candidates = [];
      const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      
      for (let i = 0; i < regions.length; i++) {
        for (const [r, c] of regions[i]) {
          for (const [dr, dc] of directions) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr === row && nc === col) {
              candidates.push(i);
              break;
            }
          }
        }
      }
      
      if (candidates.length === 0) return -1;
      
      // 如果有长度小于 minCellsNum 的 则优先排除长度大于 minCellsNum 的
      let new_candidates = [];
      for (let i = 0; i < candidates.length; i++) {
        const index = candidates[i]
        if (regions[index].length < this.minCellsNum) {
          new_candidates.push(index);
        }
      }
      
      if (new_candidates.length > 0) candidates = new_candidates;
      
      // 使用随机数选择一个候选区域
      const index = Math.floor(this.seed() * candidates.length);
      return candidates[index];
    }

    /**
     * 检查区域是否连通
     * @param {Array<Array<number>>} region - 区域格子坐标
     * @returns {boolean} 是否连通
     */
    isConnected(region) {
      if (region.length === 0) return true;
      
      const visited = new Set();
      const queue = [region[0]];
      visited.add(`${region[0][0]},${region[0][1]}`);
      
      while (queue.length > 0) {
        const [row, col] = queue.shift();
        const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        
        for (const [dr, dc] of directions) {
          const nr = row + dr;
          const nc = col + dc;
          const key = `${nr},${nc}`;
          
          if (!visited.has(key) && region.some(([r, c]) => r === nr && c === nc)) {
            visited.add(key);
            queue.push([nr, nc]);
          }
        }
      }
      
      return visited.size === region.length;
    }

    /**
     * 验证解是否唯一
     * @param {Array<Array<Array<number>>>} regions - 区域数组
     * @returns {boolean} 解是否唯一
     */
    verifyUniqueSolution(regions) {
      const solver = new StarPuzzleSolver(this.size, this.n, regions);
      return solver.hasUniqueSolution();
    }

    /**
     * 按区域大小排序
     * @param {Array<Array<Array<number>>>} regions - 区域数组
     * @returns {Array<Array<Array<number>>>} 排序后的区域数组
     */
    sortRegionsBySize(regions) {
      return regions.sort((a, b) => a.length - b.length);
    }
  }

  /**
   * 星星迷题求解器类
   */
  class StarPuzzleSolver {
    /**
     * 构造函数
     * @param {number} size - 棋盘大小
     * @param {number} n - 每行/列/区域的星星数量
     * @param {Array<Array<Array<number>>>} regions - 区域数组
     */
    constructor(size, n, regions) {
      this.size = size;
      this.n = n;
      this.regions = regions;
      this.board = Array(size).fill(null).map(() => Array(size).fill(0));
      this.solutions = [];
    }

    /**
     * 检查是否有唯一解
     * @returns {boolean} 是否有唯一解
     */
    hasUniqueSolution() {
      this.solve(0, 0);
      return this.solutions.length === 1;
    }
    
    /**
     * 返回所有解
     * @returns {Array}
     */
    getAllSolutions() {
      this.solve(0, true);
      return this.solutions;
    }

    /**
     * 递归求解
     * @param {number} row - 当前行
     * @param {number} col - 当前列
     */
    solve(row, all = false) {
      if (!all && this.solutions.length > 1) return;
      if (row === this.size) {
        if (this.isValidSolution()) {
          this.solutions.push(this.board.map(r => [...r]));
        }
        return;
      }
      
      for (let col = 0; col < this.size; col++) {
         // 尝试放星星
        if (this.canPlaceStar(row, col)) {
          this.board[row][col] = 1;
          this.solve(row + 1, all);
          this.board[row][col] = 0;
        }
      }
    }

    /**
     * 检查是否可以在指定位置放置星星
     * @param {number} row - 行
     * @param {number} col - 列
     * @returns {boolean} 是否可以放置
     */
    canPlaceStar(row, col) {
      // 检查周围八格
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && this.board[nr][nc] === 1) {
            return false;
          }
        }
      }
      
      // 检查行、列的星星数量
      let rowCount = 0, colCount = 0;
      for (let i = 0; i < this.size; i++) {
        if (this.board[row][i] === 1) rowCount++;
        if (this.board[i][col] === 1) colCount++;
      }
      if (rowCount >= this.n || colCount >= this.n) return false;
       
      // 无区域直接返回
      if (!this.regions) return true;
      // 检查区域
      const regionIndex = this.findRegion(row, col);
      if (regionIndex !== -1) {
        let regionCount = 0;
        for (const [r, c] of this.regions[regionIndex]) {
          if (this.board[r][c] === 1) regionCount++;
        }
        if (regionCount >= this.n) return false;
      }
      
      return true;
    }

    /**
     * 找到格子所属的区域
     * @param {number} row - 行
     * @param {number} col - 列
     * @returns {number} 区域索引或-1
     */
    findRegion(row, col) {
      for (let i = 0; i < this.regions.length; i++) {
        if (this.regions[i].some(([r, c]) => r === row && c === col)) {
          return i;
        }
      }
      return -1;
    }

    /**
     * 检查是否为有效解
     * @returns {boolean} 是否有效
     */
    isValidSolution() {
      // 检查每行每列
      for (let i = 0; i < this.size; i++) {
        let rowCount = 0, colCount = 0;
        for (let j = 0; j < this.size; j++) {
          if (this.board[i][j] === 1) rowCount++;
          if (this.board[j][i] === 1) colCount++;
        }
        if (rowCount !== this.n || colCount !== this.n) return false;
      }
      
      // 无区域直接返回
      if (!this.regions) return true;
      // 检查每个区域
      for (const region of this.regions) {
        let count = 0;
        for (const [r, c] of region) {
          if (this.board[r][c] === 1) count++;
        }
        if (count !== this.n) return false;
      }
      
      return true;
    }
  }

  // 测试代码
  function test() {
    const seed = new Math.seedrandom(0);
    const size = 5;
    const n = 1;
    const minCellsNum = 2;
    const solution = [
      [0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1],
      [0, 1, 0, 0, 0],
      [0, 0, 0, 1, 0],
      [1, 0, 0, 0, 0],
    ];
  
    const generator = new StarPuzzleRegionGenerator(seed, solution, size, n, minCellsNum);
    const regions = generator.generate();
    
    console.log('生成的区域方案：');
    regions.forEach((region, index) => {
      console.log(`区域 ${index + 1} (${region.length} 格)：`, region);
    });
  }
  
  class Game {
    static instance;
    container;
    size = 5;
    stars = 5;
    start_time = 0;
    ended = false;
    timer;
    star_count = 0;
    booms = [];
    levels = [
      {
        size: 5,
        star: 1,
        difficulty: 0,
      },
      {
        size: 6,
        star: 1,
        difficulty: 0,
        minCellsNum: 2,
      },
      {
        size: 6,
        star: 1,
        difficulty: 1,
        minCellsNum: 5,
      },
      {
        size: 8,
        star: 1,
        difficulty: 0,
        minCellsNum: 3,
      },
      {
        size: 8,
        star: 1,
        difficulty: 1,
        minCellsNum: 4,
      },
      {
        size: 10,
        star: 2,
        difficulty: 0,
      },
      {
        size: 10,
        star: 2,
        difficulty: 1,
        minCellsNum: 5,
      },
      {
        size: 14,
        star: 3,
        difficulty: 0,
      },
      {
        size: 14,
        star: 3,
        difficulty: 1,
        minCellsNum: 5,
      },
      {
        size: 6,
        star: 1,
        difficulty: 2,
      },
      {
        size: 8,
        star: 1,
        difficulty: 2,
      },
      {
        size: 10,
        star: 2,
        difficulty: 2,
      },
    ];
    level = 1;
    difficulties = ['普通', '困难', '不规则 (Shapeless)']

    constructor(containerSelector, level, qn) {
      if (Game.instance) {
        return Game.instance;
      }
      Game.instance = this;
      
      this.qn = qn || this.rand_qn();
      this.container = $(containerSelector);
      this.table = this.container.querySelector('.game_table');
      this.time = this.container.querySelector('.bottom_controls .time');
      this.tip = this.container.querySelector('.top_controls .tip');
      this.winBtn = this.container.querySelector('.top_controls .win');
      this.resetBtn = this.container.querySelector('.top_controls .reset');
      this.settingsBtn = this.container.querySelector('.bottom_controls .settings');
      this.settings_form = this.container.querySelector('.settings_form');
      
      this.initLevels();
      this.setLevel(level);
      this.init();
    }
    
    rand_qn() {
      return Math.floor(Math.random() * (10 ** 7)) + 1;
    }
    
    initLevels() {
      let wins = JSON.parse(getValue('wins') || '{}');
      // console.log(wins);
      for (let i = 0; i < this.levels.length; i++) {
        let level = this.levels[i];
        let text = `${level.size}x${level.size} ${level.star}&#9733; ${this.difficulties[level.difficulty]}`;
        $('.levels').appendChild(
          tag('button', {
            class: 'level' + (wins[i+1] ? ' win':''),
            attrs: {
              'data-level': i + 1,
            },
            innerHTML: text,
          })
        )
      }
    }
    
    setLevel(level) {
      if (level) this.level = parseInt(level);
      let params = new URLSearchParams(window.location.search);
      params.set('level', this.level);
      params.set('qn', this.qn);
      history.replaceState({}, '', '?' + new URLSearchParams(params).toString());
      
      $('.qn').innerText = this.qn.toLocaleString();
      this.level_info = this.levels[this.level - 1];
      if (!this.level_info) {
        this.tip.innerText = '关卡不存在';
        return
      }

      this.size = this.level_info.size;
      this.star = this.level_info.star;
      this.stars = this.star * this.size;
      this.difficulty = this.level_info.difficulty;
      const minCellsNum = this.level_info.minCellsNum || 2;
      
      const start_time = performance.now();
      this.seed = new Math.seedrandom(this.qn);
      const solver = new StarPuzzleSolver(this.size, this.star, null);
      const solutions = solver.getAllSolutions()
      // console.log(solutions);
      const rand = Math.floor(this.seed() * solutions.length)
      this.solution = solutions[rand];
  
      const generator = new StarPuzzleRegionGenerator(this.seed, this.solution, this.size, this.star, minCellsNum);
      this.regions = generator.generate();
      // this.shapeless = l.shapeless;
      const end_time = performance.now();
      console.log(`${this.size}x${this.size}生成题目用时: ${end_time - start_time}ms`)
      
      this.container.querySelector('.difficulty').innerText = this.difficulties[this.difficulty];
      this.container.querySelector('.bottom_controls .size').innerText = this.size + 'x' + this.size;
      this.container.querySelector('.bottom_controls .star').innerText = this.star;
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
      for (let i = 0; i < this.size; i++) {
        this.table.appendChild(tag('tr', {
          attrs: { 'data-index': i }, 
          children: [...Array(this.size).keys()].map(j => {
            return tag('td', { class: 'cell', 
              attrs: { 'data-index': this.size * i + j },
              children: [
                tag('div', {
                  class: 'numbers',
                  innerText: num2letter(j) + (i+1),
                }),
                tag('div', {
                  class: 'numbers1',
                  innerText: i * this.size + j,
                })
              ]
            });
          })
        }))
      };
      
      const w = this.table.getBoundingClientRect().width;
      this.table.style.height = w;
      const w1 = w/this.size < 30 ? 30 : w/this.size;
      for (const t of this.table.querySelectorAll('td')) {
        t.style.width = w1;
        t.style.height = w1;
        t.style.fontSize = w/this.size < 30 ? 25: 28;
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
        for (let i = 0; i < this.size * this.size; i++) {
          let t = this.table.querySelector(`.cell[data-index="${i}"]`)
          if (this.shapeless.indexOf(i) !== -1) {
            t.classList.add('broken');
          }
        }
        return
      }
      // 粗边框
      let layout = [];
      for (let i = 0; i < this.regions.length; i++) {
        layout[i] = [];
        for (let j = 0; j < this.regions[i].length; j++) {
          const [x, y] = this.regions[i][j];
          layout[i][j] = x * this.size + y;
        }
      }
      this.layout = layout;
      // console.log(this.regions)
      for (let i = 0; i < layout.length; i++) {
        for (let j = 0; j < layout[i].length; j++) {
          let index = layout[i][j];
          let x = index % this.size;
          let y = Math.floor(index / this.size);
          let t = this.table.querySelector(`.cell[data-index="${index}"]`)
          if (x != this.size - 1 && layout[i].indexOf(index + 1) === -1) {
            t.classList.add('bright')
          }
          if (y != this.size - 1 && layout[i].indexOf(index + this.size) === -1) {
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
        
        // 切换关卡按钮
        if (t.classList.contains('level')) {
          let level = parseInt(t.getAttribute('data-level'));
          this.qn = this.rand_qn();
          this.setLevel(level)
          this.spawnTable();
          this.reset();
          window.scroll(0, 0);
          return
        }
        // 新 题目
        if (t.classList.contains('random_qn')) {
          this.qn = this.rand_qn();
          this.setLevel(this.level)
          this.spawnTable();
          this.reset();
          window.scroll(0, 0);
          return
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
      })
      
    }
    /**
     * 同行序号
     */
    same_row(index) {
      index = parseInt(index);
      let res = [];
      let i = Math.floor(index / this.size);
      let j = index % this.size;
      for (let k = 0; k < this.size; k++) {
        if (k == j) continue;
        res.push(i * this.size + k)
      }
      return res;
    }
    /**
     * 同列序号
     */
    same_column(index) {
      index = parseInt(index);
      let res = [];
      let i = Math.floor(index / this.size);
      let j = index % this.size;
      for (let k = 0; k < this.size; k++) {
        if (k == i) continue;
        res.push(k * this.size + j)
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
      let i = Math.floor(index / this.size);
      let j = index % this.size;
      if (i != 0) {
        res.push(index - this.size);
        if (j != 0) res.push(index - this.size - 1);
        if (j != this.size - 1) res.push(index - this.size + 1);
      }
      if (i != this.size - 1) {
        res.push(index + this.size);
        if (j != 0) res.push(index + this.size - 1);
        if (j != this.size - 1) res.push(index + this.size + 1);
      }
      if (j != 0) res.push(index - 1);
      if (j != this.size - 1) res.push(index + 1);
      // 同行
      for (let k = 0; k < this.size; k++) {
        if (
          res.indexOf(i * this.size + k) === -1 && 
          i * this.size + k != index
        ) res.push(i * this.size + k)
      }
      // 同列
      for (let k = 0; k < this.size; k++) {
        if (res.indexOf(k * this.size + j) === -1 && k * this.size + j != index) res.push(k * this.size + j)
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
      let i = Math.floor(index / this.size);
      let j = index % this.size;
      let t;
      // 斜角
      if (i != 0) {
         t = this.table.querySelector(`td[data-index="${index - this.size}"]`);
        if (t.classList.contains('star')) return true;
        if (j != 0) {
          t = this.table.querySelector(`td[data-index="${index - this.size - 1}"]`);
          if (t.classList.contains('star')) return true;
        }
        if (j != this.size - 1) {
          t = this.table.querySelector(`td[data-index="${index - this.size + 1}"]`);
          if (t.classList.contains('star')) return true;
        }
      }
      if (i != this.size - 1) {
         t = this.table.querySelector(`td[data-index="${index + this.size}"]`);
          if (t.classList.contains('star')) return true;
        if (j != 0) {
          t = this.table.querySelector(`td[data-index="${index + this.size - 1}"]`);
          if (t.classList.contains('star')) return true;
        }
        if (j != this.size - 1) {
          t = this.table.querySelector(`td[data-index="${index + this.size + 1}"]`);
          if (t.classList.contains('star')) return true;
        }
      }
      if (j != 0) {
        t = this.table.querySelector(`td[data-index="${index - 1}"]`);
        if (t.classList.contains('star')) return true;
      }
      if (j != this.size - 1) {
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
      let i = Math.floor(index / this.size);
      let j = index % this.size;
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
      for (let i = 0; i < this.size * this.size; i++) {
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
      this.container.querySelector('.game_container').classList.add('win');
      
      for (let i = 0; i < this.size * this.size; i++) {
        let t = this.table.querySelector(`td[data-index="${i}"]`);
        t.classList.add('open');
        if (this.solution &&this.solution.indexOf(i) !== -1) {
          t.classList.add('star')
        }
      }
      
      let wins = JSON.parse(getValue('wins') || '{}');
      wins[this.level] = true;
      // console.log(wins)
      setValue('wins', JSON.stringify(wins))
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
    
  document.addEventListener('DOMContentLoaded', function() {
    if (isMobile()) document.body.classList.add('mobile')
    else document.body.classList.remove('mobile')
    
    let params = new URLSearchParams(window.location.search);
    new Game(
      '.container', 
      parseInt(params.get('level')), 
      parseInt(params.get('qn')), 
    );
  })
})();