(function(){
  const forget_pass_popup = new window.Popup({
    content: '<p>操作成功！</p><p>3秒后自动关闭</p>',
    timeout: 3000,  // 可选，自动关闭时间，单位ms
    title: '提示',  // 可选，标题文本
    ifDrag: true,  // 可选，是否允许拖拽, 默认为true
    dragLimit: true,  // 可选，是否限制拖拽区域, 默认为true
  
    popup_style: '', // 可选，弹窗本体的css
    title_style: 'background-color: green; ',  // 可选，标题样式，设置后title_color, title_bgcolor无效
    title_box_style: 'color: skyblue',  // 可选，标题框（包括关闭按钮）样式
    content_style: 'background-color: red; color: blue',  // 可选，内容样式，设置后content_color, content_bgcolor无效
    close_btn_style: 'width: 30px; height: 30px; border-radius: 50%; border: none;',  // 可选，关闭按钮样式
    close_svg_style: 'fill: #fff; font-size: 25px',  // 可选，关闭按钮内svg样式
  
    title_class: 'popup_title',
    title_box_class: '',
    content_class: '',
    close_btn_class: 'popup_close_box',
  });
  window.addEventListener('load', () => {
    console.log('a')
  })
  console.log(document.querySelector('.forget-pass'))
  document.querySelector('.forget-pass').addEventListener('click', () => {
    forget_pass_popup.show()
  })
})();