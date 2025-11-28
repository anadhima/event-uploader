const canvas = document.getElementById("confetti");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const confettiPieces = [];
const colors = ["#ff9ecd", "#ffffff", "#ffb3e6", "#ffd3f2"];

function ConfettiPiece() {
  this.x = Math.random() * canvas.width;
  this.y = Math.random() * canvas.height - canvas.height;
  this.size = Math.random() * 6 + 4;
  this.color = colors[Math.floor(Math.random() * colors.length)];
  this.speed = Math.random() * 2 + 1;
  this.rotate = Math.random() * 360;
}

ConfettiPiece.prototype.update = function () {
  this.y += this.speed;
  this.rotate += this.speed;

  if (this.y > canvas.height) {
    this.y = -10;
  }
};

ConfettiPiece.prototype.draw = function () {
  ctx.save();
  ctx.translate(this.x, this.y);
  ctx.rotate((this.rotate * Math.PI) / 180);
  ctx.fillStyle = this.color;
  ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
  ctx.restore();
};

for (let i = 0; i < 120; i++) {
  confettiPieces.push(new ConfettiPiece());
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiPieces.forEach((p) => {
    p.update();
    p.draw();
  });
  requestAnimationFrame(animate);
}

animate();

// Auto-redirect to homepage after 1.2 sec
setTimeout(() => {
  window.location.href = "index.html";
}, 1200);
