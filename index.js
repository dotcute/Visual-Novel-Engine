const canvas = document.getElementById('game'),
  ctx = canvas.getContext('2d'),
  image = new Image(),
  httpRequest = new XMLHttpRequest();

let assetsDir = '',
  mousePos = { x: 0, y: 0 };

// ====================================================================================================

const confirm = (title, id, placeholder, func) => {
  Swal.fire({
    title: title,
    html:
      `<input id="${id}" style="font-size: 1.2rem; border-radius: .3125em; padding: 1rem; border: 1px solid #eee" placeholder="${placeholder}">`,
    focusConfirm: false,
    confirmButtonText: '확인'
  }).then((result) => {
    func(id, () => confirm(title, id, placeholder, func));
  });
}

const alertErr = (title, html = '') => {
  Swal.fire({
    title: title,
    html: html,
    focusConfirm: true,
    confirmButtonText: '확인'
  }).then(() => {
    window.location.reload()
  })
}

const alert = (title, html = '') => {
  Swal.fire({
    title: title,
    html: html,
    focusConfirm: true,
    confirmButtonText: '확인'
  })
}

const preloading = (dir, arr) => {
  assetsDir = dir;
  arr.forEach(e => {
    let img = new Image();
    img.src = assetsDir + e;
  });
}

// ====================================================================================================

CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  this.beginPath();
  this.moveTo(x + r, y);
  this.arcTo(x + w, y, x + w, y + h, r);
  this.arcTo(x + w, y + h, x, y + h, r);
  this.arcTo(x, y + h, x, y, r);
  this.arcTo(x, y, x + w, y, r);
  this.closePath();
  return this;
}

HTMLElement.prototype.getMousePos = function (event) {
  return new Promise(async (resolve, reject) => {
    var rect = this.getBoundingClientRect();
    resolve({
        x: (event.clientX - rect.left).toFixed(),
        y: (event.clientY - rect.top).toFixed()
    });
  });
}

const isInside = (pos, rect) => {
  return pos.x > rect.x && pos.x < rect.x + rect.width && pos.y < rect.y + rect.height && pos.y > rect.y
}

// ====================================================================================================

let isClick = false;

const playScript = (json) => {
  if (!json) alert('존재하지 않는 스크립트입니다.');
  playScene(json, 'main');
};

const playScene = (script, name) => {
  return new Promise(async (resolve, reject) => {
    const scene = script[name];

    if (!scene) alert(`장면 '${name}' 이 존재하지 않습니다.`);

    for (let behavior of scene) {
      if (behavior.trigger && !eval(behavior.trigger)) continue;

      switch (behavior.type) {
        case 'conv':
          await playConv(behavior.contents);
          break;
        case 'ques':
          await playQues(behavior.content, behavior.answers);
          break;
        case 'scene':
          await playScene(script, behavior.name);
          break;
        case 'js':
          eval(behavior.code);
          break;
        default:
          alert('정의되지 않은 type 값입니다.');
          break;
      }
    }
    resolve();
  });
};

const playConv = (contents) => {
  return new Promise(async (resolve, reject) => {
    for (let content of contents) {
      await show(eval(`\`${content[0]}\``), content[1]);
      await waitUntilClick();
    }
    resolve();
  });
};

const playQues = (content, answers) => {
  return new Promise(async (resolve, reject) => {
    await show(eval(`\`${content}\``), undefined);
    console.log(await waitUntilChoose(answers.options));
    resolve();
  });
};

const waitMillisecs = (ms) => {
  return new Promise(async (resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

const waitUntilClick = () => {
  return new Promise(async (resolve, reject) => {
    let loop = setInterval(() => {
      if (isClick) {
        resolve();
        isClick = false;
        clearInterval(loop);
      }
    }, 100);
  });
};

const waitUntilChoose = (options) => {
  return new Promise(async (resolve, reject) => {
    let opRects = [];

    for (let i = 0; i < options.length; i++) {
      const pos = (280 * (i * 2 + 1) / options.length / 2) + 60;

      ctx.fillStyle = '#658EFF'
      ctx.roundRect(180, pos - 20, 600, 40, 10).fill();
      
      ctx.fillStyle = 'white'
      ctx.fillText(options[i], (canvas.width / 2) - (ctx.measureText(options[i]).width / 2), pos + 8);

      opRects[i] = {
        x: 180,
        y: pos - 20,
        width: 600,
        height: 40
      };
    }

    await waitUntilClick();

    for (let i = 0; i < options.length; i++) {
      if (isInside(mousePos, opRects[i])) {
        resolve(i);
      }
    }
    
    resolve(await waitUntilChoose(options));
  })
}

const show = (text, img, smooth = true) => {
  return new Promise(async (resolve, reject) => {
    if (img) image.src = `${assetsDir}${img}.png`

    let talker = undefined;
    if (text.split(': ').length > 1) {
      const arr = text.split(': ');
      talker = arr.shift();
      text = '"' + arr.join(': ') + '"';
    } else {
      talker = nickname;
      text = '(' + text + ')';
    }

    if (smooth) {
      for (let i = 1; i <= text.length; i++) {
        showTalker(talker);

        ctx.fillStyle = '#658EFF'
        ctx.roundRect(140, 410, canvas.width - 280, 90, 10).fill();

        ctx.fillStyle = 'white'
        ctx.fillText(text.slice(0, i), (canvas.width / 2) - (ctx.measureText(text).width / 2), 462);

        await waitMillisecs(33);
        isClick = false;
      }
    } else {
      ctx.fillStyle = '#658EFF'
      ctx.roundRect(140, 410, canvas.width - 280, 90, 10).fill();
       
      showTalker(talker);

      ctx.fillStyle = 'white'
      ctx.fillText(text, (canvas.width / 2) - (ctx.measureText(text).width / 2), 470);
    }
    resolve();
  });

}

const showTalker = (name) => {
  ctx.lineWidth = 5;
  ctx.fillStyle = 'white'
  ctx.roundRect(160, 370, 160, 50, 10).fill();
  ctx.strokeStyle = '#658EFF'
  ctx.roundRect(160, 370, 160, 50, 10).stroke();

  ctx.fillStyle = '#658EFF'
  ctx.fillText(name, 240 - (ctx.measureText(name).width / 2), 400);
}


// ====================================================================================================

image.addEventListener('load', () => {
  ctx.drawImage(image, 0, 0, 960, 540);
}, false);

canvas.addEventListener('click', async event => {
  mousePos = await canvas.getMousePos(event);
  isClick = true;
});