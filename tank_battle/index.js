(function(){
  'use strict';
  
  let IS_IOS = /iPad|iPhone|iPod/.test(window.navigator.platform);
  let IS_MOBILE = /Android/.test(window.navigator.userAgent) || IS_IOS;
  
  const isNumber = s => Object.prototype.toString.call(s) === "[object Number]";
  const isString = s => Object.prototype.toString.call(s) === "[object String]";
  const isArrayLike = s => s != null && typeof s[Symbol.iterator] === 'function';
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
   * 碰撞检测
   */
  function collisionDetection(obj_0, obj_1, passIdArray_0, passIdArray_1){
    let collisionObj = {};
    for (const i in obj_0) {
      let ai = obj_0[i];
      if (passIdArray_0.includes(ai.id)) {
        continue;
      }
      // console.log('obj1', obj_1)
      for (const j in obj_1) {
        let aj = obj_1[j];
        if (passIdArray_1.includes(aj.id)) {
          continue;
        }
        let r_0 = {
          left: ai.x,
          top: ai.y,
          right: ai.x + ai.width,
          bottom: ai.y + ai.height,
        };
        let r_1 = {
          left: aj.x,
          top: aj.y,
          right: aj.x + aj.width,
          bottom: aj.y + aj.height
        };
        
        // 如果发生碰撞
        if (isCollision(r_0, r_1)) {
          // console.log('c')
          if (collisionObj[ai]) {
            collisionObj[ai].push(aj);
          } else {
            collisionObj[ai] = [];
            collisionObj[ai].push(aj);
          }
        }
      }
    
    }
    
    return collisionObj;
    
    /**
     * 判断是否碰撞
     */
    function isCollision(r_0, r_1){
      if (r_0.left >= r_1.left && r_0.left >= r_1.right) { 
        return false;
      } else if (r_0.left <= r_1.left && r_0.right <= r_1.left) {
        return false;
      } else if (r_0.top >= r_1.top && r_0.top >= r_1.bottom) {
        return false;
      } else if (r_0.top <= r_1.top && r_0.bottom <= r_1.top) {
        return false;
      }
      return true;
    }
  }
  
  function addArray(obj, array){
    let a = [];
    for(let i in array){
      a[i] = array[i];
    }
    a[a.length] = obj;
    return a;
  }
  
  /**
   * 分别获取旋转90°,180°,270°的img
   */
  function imgRotate(img){
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    let imgs = [new Image(),new Image(),new Image()];
    canvas.height = img.height;
    
    //定义3个角度的参数
    let items = [
      {"angle":90,"x":0,"y":-img.height},
      {"angle":180,"x":-img.width,"y":-img.height},
      {"angle":270,"x":-img.width,"y":0}
    ];
    
    for(let i in items){
      canvas.width = img.width;//更改大小后会清空canvas中的内容
      ctx.rotate(items[i].angle*Math.PI/180);//旋转指定角度
      ctx.drawImage(img, items[i].x, items[i].y);//绘制图形
      imgs[i].src = canvas.toDataURL("image/png");//获取图形src
    }
    return imgs;
  }
  
  
  class Settings {
    canvasWidth = 650;
    canvasHeight = 650;
    // 单个格子（地图块）宽度
    cellWidth = 50;
    // 单个格子（地图块）高度
    cellHeight = 50;
    // 地图背景颜色
    mapBackground = "#000000";
    // 坦克可行走地图块
    tankWalkableMapBlock = [4,5];
    // 地面地图块id
    groundMapBlockId = 0;
    // 雪地地图块id
    hongQiangMapBlockId = 1;
    // 铁块地图块id
    tieQiangMapBlockId = 2;
    // 水路地图块id
    shuiMapBlockId = 3;
    // 草地地图块id
    caoDiMapBlockId = 4;
    // 雪地地图块id
    xueDiMapBlockId = 5;
    // 雪地移动速度
    xueDiSpeed = 2;
    
    // 地图块id对于的生命值
    MapBlockHp = [0,1,3,0,0,0];
    MapBlockLevel = [99,1,2,99,99,99];
    
    // 子弹宽度
    bulletWidth = 4;
    // 子弹高度
    bulletHeight = 10;
    // 子弹速度
    bulletSpeed = 5;
    // 子弹伤害
    bulletDamage = 1;
    // 子弹颜色
    bulletColor = "#FFFFFF";
    
    // 自动开火可能性，数值越大可能性越小
    autoFireProbability = 70;
    // 自动改变方向可能性，数值越大可能性越小
    autoChangeDirectionProbability = 35;
    
    // 地图数据对应的图片
    imgSrc = [
      "img/ground.png",
      "img/hongQiang.png",
      "img/tieQiang.png",
      "img/shui.png",
      "img/caoDi.png",
      "img/xueDi.png"
    ];
    // 所有地图数据
    map = [
      [  //第一关
        [0,0,0,0,0,0,0,0,0,0,0,0,0],
        [1,0,4,1,1,1,1,1,1,1,1,1,2],
        [0,0,2,0,0,0,0,0,3,3,3,4,4],
        [0,0,0,0,3,3,0,0,3,3,3,4,4],
        [5,5,2,1,3,3,0,0,4,4,4,4,4],
        [5,5,2,4,4,4,0,0,5,5,5,5,5],
        [5,5,0,4,4,4,0,0,1,1,1,1,1],
        [5,5,0,4,4,4,0,0,0,0,0,0,0],
        [5,5,0,3,3,3,3,3,3,3,0,0,4],
        [0,0,0,0,0,0,0,0,0,0,0,0,4],
        [2,2,0,0,0,2,2,2,0,0,0,2,2],
        [4,4,0,0,0,3,3,3,0,0,0,4,4],
        [0,0,0,0,0,1,1,1,0,0,0,0,0]
      ],
      [  //第二关
        
      ]
    ];
  }


  class Tank {
    constructor (game, imgIndex, camp, x, y, hp, direction, id) {
      this.game = game;
      this.settings = game.settings;
      this.draw = game.draw;
      this.x = x || 100;
      this.y = y || 350;
      this.width = this.settings.cellWidth;
      this.height = this.settings.cellHeight;
      this.speed = 3;  //速度
      this.hp = hp || 1;  
      this.imgs = {
        "up": new Image(), 
        "down": null,
        "left": null,
        "right": null,
      }; 
      this.direction = direction || "up"; 
      this.id = id || 0;
      this.maxBulletNumber = 30;
      this.bullets = [];
      this.camp = camp || 0;  // 阵营
      this.level = 1;
      
      // 上次移动时的x
      this.previousX = null; 
      // 上次移动时的y
      this.previousY = null;
      
      // 设置坦克图片
      this.setImg(imgIndex || 0);
    }
    
    /**
     * 自动控制
     */
    autoControl () {
      this.update();
      // 根据概率改变方向
      if(0 == parseInt(Math.random() * this.settings.autoChangeDirectionProbability)){
        this.direction = ["up","down","left","right"][parseInt(Math.random()*4)];
      }
      
      if (this.x == this.previousX && this.y == this.previousY) {
        this.direction = ["up","down","left","right"][parseInt(Math.random()*4)];
      }
      this.previousX = this.x;
      this.previousY = this.y;
      
      if (0 == parseInt(Math.random() * this.settings.autoFireProbability)) {
        // 根据概率自动开火
        this.fire();
      }
    }
    
    setImg(index) {
      let imgSrc = ["img/tank_1.png", "img/tank_2.png"];
      this.imgs.up.src = imgSrc[index];
      this.imgs.up.width = this.settings.cellWidth;
      this.imgs.up.height = this.settings.cellHeight;
      
      this.imgs.up.onload = () => {//当原图加载完成后设置旋转后的图片
        //分别获取旋转90°,180°,270°的img
        let imgsArray = imgRotate(this.imgs.up);
        this.imgs.right = imgsArray[0];
        this.imgs.down = imgsArray[1];
        this.imgs.left = imgsArray[2];
      }
    }
    
    /**
     * 根据方向移动坦克
     */
    moveTank(speed) {
      switch(this.direction){
        case "up":
          this.y -= speed;
          break;
        case "down":
          this.y += speed;
          break;
        case "left":
          this.x -= speed;
          break;
        case "right":
          this.x += speed;
          break;
      }
    }
    
    update() {
      this.moveTank(this.speed);
      
      // 检测是否撞到物体
      let col = collisionDetection(
        [this], 
        this.draw.mapBlocks, 
        [], 
        [this.settings.groundMapBlockId]
      );  // 碰撞检测，并跳过空地地图块
      let xueDiMove = false;  // 雪地移动
      for(let key in col){
        for(let i in col[key]){
          // 判断是否为坦克可行走地图块
          if(this.settings.tankWalkableMapBlock.includes(col[key][i].id)){
            
            if(col[key][i].id == this.settings.xueDiMapBlockId && !xueDiMove){
              //检测是否是雪地
              this.moveTank(this.settings.xueDiSpeed);
              //是雪地则增加移动速度（再移动一次）
              xueDiMove = true;
            }
            continue;
          }
          // 不可行走地图块，根据方向调整坦克位置
          switch(this.direction){
            case "up":
              if(this.y < col[key][i].y + col[key][i].height){
                this.y = col[key][i].y + col[key][i].height;
              }
              break;
            case "down":
              if(this.y > col[key][i].y - this.height){
                this.y = col[key][i].y - this.height;
              }
              break;
            case "left":
              if(this.x < col[key][i].x + col[key][i].width){
                this.x = col[key][i].x + col[key][i].width;
              }
              break;
            case "right":
              if(this.x > col[key][i].x - this.width){
                this.x = col[key][i].x - this.width;
              }
              break;
          }
        }  
      }
      
      // 限制坦克到达屏幕外边
      if(this.x < 0) this.x = 0;
      if(this.y < 0) this.y = 0;
      if(this.x > this.settings.canvasWidth - this.width) this.x = this.settings.canvasWidth - this.width;
      if(this.y > this.settings.canvasHeight - this.height) this.y = this.settings.canvasHeight - this.height;
    }
    
    /**
     * 开火
     */
    fire() {
      if (this.hp <= 0) return;
      if (this.bullets.length >= this.maxBulletNumber) return;
      let bulletPosition = {
        up: {
          x: this.x + (this.width - this.settings.bulletWidth) / 2,
          y: this.y - this.settings.bulletHeight,
          width: this.settings.bulletWidth,
          height: this.settings.bulletHeight,
          speedX: 0,
          speedY: -this.settings.bulletSpeed
        },
        down: {
          x: this.x + (this.width - this.settings.bulletWidth) / 2,
          y: this.y + this.height,
          width: this.settings.bulletWidth,
          height: this.settings.bulletHeight,
          speedX: 0,
          speedY: this.settings.bulletSpeed
        },
        left: {
          x: this.x - this.settings.bulletHeight,
          y: this.y + (this.height - this.settings.bulletWidth)/2,
          width: this.settings.bulletHeight,
          height: this.settings.bulletWidth,
          speedX: -this.settings.bulletSpeed,
          speedY: 0,
        },
        right: {
          x: this.x + this.width,
          y: this.y + (this.height - this.settings.bulletWidth)/2,
          width: this.settings.bulletHeight,
          height: this.settings.bulletWidth,
          speedX: this.settings.bulletSpeed,
          speedY: 0,
        }
      };
      
      // 根据方向获取子弹出现位置
      let bp = bulletPosition[this.direction];
      this.bullets.push(new Bullet(
        this.game,
        bp.x,
        bp.y,
        bp.width,
        bp.height,
        bp.speedX,
        bp.speedY,
        this.settings.bulletColor,
        this.settings.bulletDamage,
        this.camp,
      ));
        
      
    }
  }
  
  
  class Bullet {
    constructor (game, x, y, width, height, speedX, speedY, color, damage, camp) {
      this.game = game;
      this.settings = game.settings;
      this.draw = game.draw;
      this.tank = game.tank;
      this.tanks = game.tanks;
      // 横坐标
      this.x = x;
      // 纵坐标
      this.y = y;
      // 宽度
      this.width = width;
      // 高度
      this.height = height;
      // 颜色
      this.color = color; 
      // 每次横向移动距离
      this.speedX = speedX; 
      // 每次纵向移动距离
      this.speedY = speedY;
      // 伤害
      this.damage = damage; 
      // 所属阵营
      this.camp = camp;
      // 子弹等级
      this.level = 1;
    }
    
    /**
     * 更新子弹坐标, 在屏幕之外的返回 false
     */
    update() {
      // 子弹是否继续保留（没有撞到东西）
      let dis = true;
      
      this.x += this.speedX;
      this.y += this.speedY;
      if (
        this.x + this.width < 0 || 
        this.y + this.height < 0 || 
        this.x > this.settings.canvasWidth || 
        this.y > this.settings.canvasHeight
      ) dis = false;
      
      // 与地图块碰撞检测, 并跳过空地地图块
      let col = collisionDetection(
        [this], 
        this.draw.mapBlocks, 
        [],
        [this.settings.groundMapBlockId, 3, 4, 5],
      );
      // console.log(col)
      for(let key in col){
        for(let i in col[key]){
          let ai = col[key][i];
          // console.log(col[key][i]);
          dis = false
          // 判断子弹等级是否大于地图块等级, 低等级子弹无法对高等级地图块造成伤害
          if(this.level >= ai.level){
            
            // 根据伤害值减少生命值
            ai.hp -= this.damage;
            // 如果生命值小于等于0
            if(ai.hp <= 0){
              ai.id = this.settings.groundMapBlockId;
              ai.img = this.draw.imgs[this.settings.groundMapBlockId];
              
            }
          }
          
        }
      }
      
      // 与敌方坦克块碰撞检测, 并跳过空地地图块
      let tempTanks = addArray(this.tank, this.tanks);
      col = collisionDetection([this], tempTanks, [], []);
      for(let key in col){
        for(let i in col[key]){
          let ai = col[key][i];
          
          // 子弹等级大于等于坦克等级且子弹和坦克不属于同一阵营则造成伤害
          if(this.level >= ai.level && this.camp != ai.camp){
            ai.hp -= this.damage;
            dis = false
          }
          
        }
      }
      
      return dis;
    }
  }
  
  /**
   * 绘制对象，用于在屏幕上绘制地图坦克等
   */
  class Draw {
    constructor (game) {
      this.game = game;
      this.settings = game.settings;
      this.ctx = game.ctx;
      // 获取地图图片数组
      this.imgs = this.getMapImgArray();
      // 根据地图图片数组和地图图片数据生成地图块数组
      this.mapBlocks = this.getMapBlock(game.level);
    }
    
    getMapImgArray() {//加载所有图像数据
      let imgSrc = this.settings.imgSrc;
      
      let imgs = [];
      for(let i in imgSrc){
        imgs[i] = new Image();
        imgs[i].src = imgSrc[i];
        imgs[i].width = this.settings.cellWidth;
        imgs[i].height = this.settings.cellHeight;
      }
      return imgs;
    }
    
    /**
     * 根据地图图片数组和地图图片数据生成地图块数组
     */
    getMapBlock(index) {
      // 获取地图数据
      let map = this.settings.map[index];
      
      let mapBlocks = [];
      for(let i in map){
        i = parseInt(i);
        for(let j in map[i]){
          j = parseInt(j);
          let id = map[i][j];
          let img = this.imgs[id];
          mapBlocks[i * map[i].length + j] = new MapBlock(
            this.game,
            img,
            j * img.width,
            i * img.height,
            img.width,
            img.height,
            id,
          );
        }
      }
      return mapBlocks;
    }
    
    /**
     * 在屏幕上绘制所有游戏内容
     */
    draw() {
      this.drawBackground();
      // 绘制地图并跳过草地，下标为4
      this.drawMap(4, false);
      
      let tempTanks = addArray(this.game.tank, this.game.tanks);
      this.drawTanks(tempTanks);
      this.drawBullets(tempTanks);
      
      // 只绘制草地块
      this.drawMap(4, true);
    }
    
    // 绘制背景
    drawBackground() {
      this.ctx.fillStyle = this.settings.mapBackground;
      this.ctx.fillRect(0, 0, this.settings.canvasWidth, this.settings.canvasHeight);
      
      if (!this.playing) {
        Game.images.intro.onload = () => {
          this.ctx.drawImage(
            Game.images.intro, 
            0, 0, 
            Game.images.intro.width, Game.images.intro.height, 
            this.settings.canvasWidth * 0.10, 
            this.settings.canvasHeight * 0.15, 
            this.settings.canvasWidth * 0.8, 
            this.settings.canvasHeight * 0.8
          );
        }
      }
      
    }
    
    drawTanks(tanks) {
      for(let i in tanks){
        let tankImg = tanks[i].imgs[tanks[i].direction];
        // 为null时直接跳过绘制, 因为图片未处理完成时为 null
        if(tankImg){
          this.ctx.drawImage(tankImg,tanks[i].x,tanks[i].y,tanks[i].width,tanks[i].height);
        }
      }
    }
    
    drawBullets(tanks) {
      for(let i in tanks){
        let b = tanks[i].bullets;
        for(let i in b){
          this.ctx.fillStyle = b[i].color;
          this.ctx.fillRect(b[i].x,b[i].y,b[i].width,b[i].height);
        }
      }
    }
    
    /**
     * 绘制地图
     * pass: 要跳过的地图块
     * flip: 反转, 只绘制指定地图块
     */
    drawMap(pass, flip) {
      for(let block of Object.values(this.mapBlocks)){
        // 检查是否存在缓存
        if (block.img.complete) {
          // 判断是否翻转, 翻转则只绘制指定地图块
          if (flip) {
            if (block.id == pass) {
              this.ctx.drawImage(
                block.img,
                block.x,
                block.y,
                block.width,
                block.height,
              );
            }
          } else {
            if (block.id != pass) {
              this.ctx.drawImage(
                block.img,
                block.x,
                block.y,
                block.width,
                block.height,
              );
            }
            
          }
        
        }
       
      }

        
    }
  }
  
  /**
   * 地图块
   */
  class MapBlock {
    constructor (game, img, x, y, width, height, id) {
      this.game = game;
      this.settings = game.settings;
      this.img = img;
      
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.id = id;
      // 地图块生命值
      this.hp = this.settings.MapBlockHp[id];
      // 地图块等级，低等级子弹无法对高等级地图块造成伤害
      this.level = this.settings.MapBlockLevel[id];
    }
  }
  
  
  class Control {
    direction = null;
    
    constructor (game) {
      this.game = game;
      this.tank = game.tank;
      this.tanks = game.tanks;
    }
    
    update() {
      // 更新坦克
      this.updateTank();
      // 更新子弹
      this.tank.bullets = this.updateBullets(this.tank.bullets);
      
      for(let i in this.tanks) {
        this.tanks[i].bullets = this.updateBullets(this.tanks[i].bullets);
      }
      // 把生命值耗尽的坦克删除
      this.tanks.forEach((t) => {
        if (t.hp <= 0) {
          t.x = -100
          t.y = -100
        }
      })
    }
  
    /**
     * 更新坦克
     */
    updateTank() {
      // console.log(this.direction)
      if(this.direction != null){//判断方向控制是否为空
        this.tank.direction = this.direction;
        this.tank.update();
      }
      //tank.autoControl();//自动控制
      
      for(let i in this.tanks){
        this.tanks[i].autoControl();//坦克编组自动控制
      }
    }
    
    /**
     * 更新子弹
     */
    updateBullets(bullets) {
      let bu = [];
      for(let i in bullets){
        if(bullets[i].update()){
          // 更新子弹坐标, 在屏幕之外或消失的子弹的返回 false
          bu.push(bullets[i]);
        }
      }
      return bu;
    }
  }
  
  
  class Game {
    static events = {
      KEYDOWN: 'keydown',
      KEYUP: 'keyup',
      MOUSEDOWN: 'mousedown',
      MOUSEUP: 'mouseup',
      TOUCHSTART: 'touchstart',
      TOUCHEND: 'touchend',
    }
    static keycodes = {
      UP: { 'KeyW': 1, 'ArrowUp': 1 },
      DOWN: { 'KeyS': 1, 'ArrowDown': 1 },
      LEFT: { 'KeyA': 1, 'ArrowLeft': 1 },
      RIGHT: { 'KeyD': 1, 'ArrowRight': 1 },
    }
    static images = {}
    static sounds = {
      intro: tag('audio', {
        attrs: {
          autobuffer: '',
          loop: '',
          src: 'sounds/intro.wav',
        }
      }),
      star: tag('audio', {
        attrs: {
          autobuffer: '',
          src: 'sounds/star.wav',
        }
      }),
      gameOver: tag('audio', {
        attrs: {
          autobuffer: '',
          src: 'sounds/gameOver.wav',
        }
      }),
    }
    playing = false;
    crashed = false;
    win = false;
    timer = null;
    level = 0;
    
    constructor() {
      if (Game.instance) {
        return Game.instance;
      }
      Game.instance = this;
      Game.images.intro = new Image();
      Game.images.intro.src = 'pic/tank_main@2.png';
      Game.images.gameOver = new Image();
      Game.images.gameOver.src = 'pic/tank_game_over@2.png';
    
      this.canvas = document.getElementById("canvas");
      this.ctx = canvas.getContext("2d");
      this.settings = new Settings();
      this.draw = new Draw(this);
      canvas.width = this.settings.canvasWidth;
      canvas.height = this.settings.canvasHeight;
      
      // 敌人
      this.tanks = [];
      // 我方坦克
      this.tank = new Tank(this, 0, 1, null, null, 3);
      this.control = new Control(this);
    
      this.myTankHp = document.getElementById("myTankHp");
      this.enemyTankNumber = document.getElementById("enemyTankNumber");
      // 初始化敌方坦克
      for (let i = 0; i < 10; i++) {
        this.tanks.push(new Tank(
          this, 
          1, 
          0,
          parseInt(Math.random() * this.settings.canvasWidth),
          parseInt(Math.random() * this.settings.canvasHeight)
        ));
      }
      
      this.buttons = {
        up: document.querySelector('.btn.up'),
        down: document.querySelector('.btn.down'),
        left: document.querySelector('.btn.left'),
        right: document.querySelector('.btn.right'),
        fire: document.querySelector('.btn.fire'),
      }
      this.draw.draw();
      this.startListening();
    }
    
    // 游戏计数
    gameCount(){
      myTankHp.innerHTML = "我方坦克生命值：" + this.tank.hp;
      enemyTankNumber.innerHTML = "敌方剩余坦克数：" + this.tanks.filter(t => t.hp > 0).length;
    }
  
    handleEvent(e) {
      return (function (evtType, events) {
        switch (evtType) {
          case events.KEYDOWN:
          case events.TOUCHSTART:
          case events.MOUSEDOWN:
            this.onKeyDown(e);
            break;
          case events.KEYUP:
          case events.TOUCHEND:
          case events.MOUSEUP:
            this.onKeyUp(e);
            break;
        }
      }.bind(this))(e.type, Game.events);
    }
    
    startListening() {
      document.addEventListener(Game.events.KEYDOWN, this);
      document.addEventListener(Game.events.KEYUP, this);
      
      if (IS_MOBILE) {
        document.addEventListener(Game.events.TOUCHSTART, this)
        document.addEventListener(Game.events.TOUCHEND, this)
      } else {
        document.addEventListener(Game.events.MOUSEDOWN, this)
        document.addEventListener(Game.events.MOUSEUP, this)
      }
      
    }
    
    stopListening() {
      document.removeEventListener(Game.events.KEYDOWN, this);
      document.removeEventListener(Game.events.KEYUP, this);
      
      if (IS_MOBILE) {
        document.removeEventListener(Game.events.TOUCHSTART, this)
        document.removeEventListener(Game.events.TOUCHEND, this)
      } else {
        document.removeEventListener(Game.events.MOUSEDOWN, this)
        document.removeEventListener(Game.events.MOUSEUP, this)
      }
      
    }
    
    onKeyDown(e) {
      if (!IS_MOBILE && this.playing) {
        e.preventDefault();
      }
      
      if (!this.playing) return;
      if (this.crashed) return;
      if (this.win) return;
      
      let direction = null;
      if (e.type == Game.events.KEYDOWN) {
        switch (e.code) {
          case Game.keycodes.UP[e.code]:
            direction = 'up';
            break;
          case Game.keycodes.DOWN[e.code]:
            direction = 'down';
            break;
          case Game.keycodes.LEFT[e.code]:
            direction = 'left';
            break;
          case Game.keycodes.RIGHT[e.code]:
            direction = 'right';
            break;
        }
      } else {
        const t = e.target.closest('.btn');
        if (t) {
          switch(true) {
            case t.classList.contains('up'):
              direction = 'up';
              break;
            case t.classList.contains('down'):
              direction = 'down';
              break;
            case t.classList.contains('left'):
              direction = 'left';
              break;
            case t.classList.contains('right'):
              direction = 'right';
              break;
          }
        }
      }
      
      if (this.control.direction != direction) {
        this.control.direction = direction;
      }
    }
    
    onKeyUp(e) {
      e.preventDefault();
      
      if (!this.playing && e.type != Game.events.KEYUP && e.target.closest('canvas')) {
        this.start();
      }
      
      if (!this.playing) return;
      if (this.crashed) return;
      if (this.win) return;
      
      let direction = null;
      let fire = false;
      if (e.type == Game.events.KEYDOWN) {
        switch (1) {
          case Game.keycodes.UP[e.code]:
            direction = 'up';
            break;
          case Game.keycodes.DOWN[e.code]:
            direction = 'down';
            break;
          case Game.keycodes.LEFT[e.code]:
            direction = 'left';
            break;
          case Game.keycodes.RIGHT[e.code]:
            direction = 'right';
            break;
          case Game.keycodes.FIRE[e.code]:
            fire = true;
        }
      } else {
        const t = e.target.closest('.btn');
        if (t) {
          switch(true) {
            case t.classList.contains('up'):
              direction = 'up';
              break;
            case t.classList.contains('down'):
              direction = 'down';
              break;
            case t.classList.contains('left'):
              direction = 'left';
              break;
            case t.classList.contains('right'):
              direction = 'right';
              break;
            case t.classList.contains('fire'):
              fire = true;
              break;
          }
        }
        
      }
      
      if (this.control.direction == direction) {
        this.control.direction = null;
      }
      if (fire) {
        this.tank.fire();
      }
      
    }
    
    start() {
      if (this.playing) return;
      this.timer = setInterval(this.update.bind(this), 30);
      this.playing = true;
      Game.sounds.intro.play()
    }
    
    stop() {
      if (!this.playing) return;
      clearInterval(this.timer);
      this.timer = null;
      this.playing = false;
    }
    
    update() {
      if (!this.playing) return;
      if (this.crashed) return;
      if (this.win) return;
      
      this.control.update();
      this.draw.draw(); // 绘制游戏屏幕
      this.gameCount();  // 游戏计数
    
      if (this.tank.hp <= 0) {
        this.gameOver();
      }
      if(this.tanks.filter(t => t.hp > 0).length == 0){
        this.gameWin();
      }
      
    }
    
    gameEnd() {
      Game.sounds.intro.pause()
    }
    
    gameOver() {
      this.gameEnd();
      this.crashed = true;
      Game.sounds.gameOver.play()
    
      this.ctx.drawImage(
        Game.images.gameOver, 
        0, 0, 
        Game.images.gameOver.width, Game.images.gameOver.height, 
        this.settings.canvasWidth * 0.10, 
        this.settings.canvasHeight * 0.2, 
        this.settings.canvasWidth * 0.8, 
        this.settings.canvasHeight * 0.8
      );
      
    }
    
    gameWin () {
      this.gameEnd();
      this.win = true;
      Game.sounds.star.play()
    }
  }
  
  window.addEventListener('load', () => {
    const game = new Game();
  })
})();