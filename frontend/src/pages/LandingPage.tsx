import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Matter from 'matter-js';
import './LandingPage.css';

const productNames = [
  "Samsung", "iPhone", "Sony", "Dell", "Apple", "Samsung", "iPad",
  "Bose", "GoPro", "Kindle", "Xiaomi", "Deals", "Anker", "Sony",
  "Nintendo", "Asus", "JBL", "Canon", "Offers", "Sales", "Lenovo",
  "Ring", "Dyson", "Razer", "LG", "Nike", "Adidas", "Levi's", "Zara",
  "H&M", "The North Face", "Converse", "Polo", "Uniqlo", "Puma",
  "Tommy Hilfiger", "Gucci", "Calvin Klein", "Vans", "Under Armour",
  "Atomic Habits", "kids", "Deep Work", "Sapiens", "Games", "Socks",
  "Watches", "oppo", "Clean Code", "books", "Mobiles", "Zero to One",
  "Introduction to Algorithms", "The Subtle Art", "Machine Learning Yearning",
  "Instant Pot", "Nespresso", "Philips", "iRobot", "KitchenAid", "Dyson",
  "versace", "oven", "Fridge", "Televsion", "Cuisinart 14-Cup Coffee Maker",
  "Shark Navigator Vacuum", "LG French Door Fridge", "US polo", "huawei"
];

const oldColors = [
  "White", "Snow", "HoneyDew", "MintCream", "Azure", "AliceBlue",
  "GhostWhite", "WhiteSmoke", "SeaShell", "Beige", "OldLace",
  "FloralWhite", "Ivory", "AntiqueWhite", "Linen", "LavenderBlush", "MistyRose"
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bodiesDOMRef = useRef<{ body: Matter.Body, elem: HTMLDivElement }[]>([]);
  const requestRef = useRef<number>(0);
  const [gravityOn, setGravityOn] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Audio Context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    audioCtxRef.current = new AudioContext();

    const playCollisionSound = (velocity: number) => {
      if (!audioCtxRef.current) return;
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
      const intensity = Math.max(0, Math.min(velocity / 15, 1));
      if (intensity < 0.1) return;

      const osc = audioCtxRef.current.createOscillator();
      const gain = audioCtxRef.current.createGain();
      osc.connect(gain);
      gain.connect(audioCtxRef.current.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(300 + Math.random() * 200, audioCtxRef.current.currentTime);
      const now = audioCtxRef.current.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(intensity * 0.3, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.15);
    };

    // Engine Setup
    const engine = Matter.Engine.create();
    engineRef.current = engine;
    const world = engine.world;

    const render = Matter.Render.create({
      element: document.body, // The original code appended canvas to body
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: "transparent"
      }
    });
    renderRef.current = render;
    
    // We need to style the canvas to make it invisible but interactive as per original
    render.canvas.style.position = 'absolute';
    render.canvas.style.top = '0';
    render.canvas.style.left = '0';
    render.canvas.style.opacity = '0';
    render.canvas.style.pointerEvents = 'auto';
    render.canvas.style.zIndex = '5';
    // Append to wrapper instead of document.body directly to scope it
    const wrapper = document.querySelector('.landing-wrapper');
    if (wrapper) {
      wrapper.appendChild(render.canvas);
    }

    Matter.Render.run(render);
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    Matter.Events.on(engine, "collisionStart", (event) => {
      event.pairs.forEach(pair => {
        const speedA = pair.bodyA.velocity ? Math.hypot(pair.bodyA.velocity.x, pair.bodyA.velocity.y) : 0;
        const speedB = pair.bodyB.velocity ? Math.hypot(pair.bodyB.velocity.x, pair.bodyB.velocity.y) : 0;
        playCollisionSound(speedA + speedB);
      });
    });

    const createWalls = () => {
      const thickness = 100;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const existing = Matter.Composite.allBodies(world).filter(b => b.label === "wall" || b.label === "floor");
      Matter.Composite.remove(world, existing);

      const walls = [
        Matter.Bodies.rectangle(w / 2, h + thickness / 2, w, thickness, { isStatic: true, label: "floor", friction: 0.5 }),
        Matter.Bodies.rectangle(-thickness / 2, h / 2, thickness, h * 3, { isStatic: true, label: "wall", friction: 0 }),
        Matter.Bodies.rectangle(w + thickness / 2, h / 2, thickness, h * 3, { isStatic: true, label: "wall", friction: 0 })
      ];
      Matter.Composite.add(world, walls);
    };

    const spawnColors = () => {
      const w = window.innerWidth;
      bodiesDOMRef.current = [];

      productNames.forEach((name, index) => {
        const x = Math.random() * (w - 150) + 75;
        const y = -Math.random() * 3000 - 200;
        const width = name.length * 9 + 34;
        const height = 40;

        const body = Matter.Bodies.rectangle(x, y, width, height, {
          angle: Math.random() * 0.5 - 0.25,
          restitution: 0.5,
          friction: 0.05,
          label: name
        });

        const elem = document.createElement("div");
        elem.className = "color-body";
        elem.textContent = name;
        elem.style.width = `${width}px`;
        elem.style.height = `${height}px`;
        elem.style.backgroundColor = oldColors[index % oldColors.length];
        
        if (sceneRef.current) {
          sceneRef.current.appendChild(elem);
        }

        setTimeout(() => {
          const rgb = window.getComputedStyle(elem).backgroundColor.match(/\d+/g);
          if (rgb) {
            const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
            elem.style.color = brightness > 140 ? "#1a1a1a" : "#ffffff";
          }
        }, 100);

        bodiesDOMRef.current.push({ body, elem });
        Matter.Composite.add(world, body);
      });
    };

    const updateLoop = () => {
      bodiesDOMRef.current.forEach(({ body, elem }) => {
        const { position, angle } = body;
        elem.style.transform = `translate(${position.x - elem.offsetWidth / 2}px, ${position.y - elem.offsetHeight / 2}px) rotate(${angle}rad)`;
      });
      requestRef.current = requestAnimationFrame(updateLoop);
    };

    // Mouse Control
    const mouse = Matter.Mouse.create(render.canvas);
    const mouseConstraint = Matter.MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
    Matter.Composite.add(world, mouseConstraint);

    createWalls();
    spawnColors();
    updateLoop();

    const handleResize = () => {
      render.canvas.width = window.innerWidth;
      render.canvas.height = window.innerHeight;
      createWalls();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      if (render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas);
      }
      Matter.Engine.clear(engine);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const toggleGravity = () => {
    if (engineRef.current) {
      const newGravity = !gravityOn;
      setGravityOn(newGravity);
      engineRef.current.gravity.y = newGravity ? 1 : 0;
    }
  };

  const handleExplode = () => {
    bodiesDOMRef.current.forEach(({ body }) => {
      const force = 0.05 * body.mass;
      const angle = Math.random() * Math.PI * 2;
      Matter.Body.applyForce(body, body.position, {
        x: Math.cos(angle) * force,
        y: Math.sin(angle) * force
      });
    });
  };

  const handleEnter = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate('/login');
    }, 1500); // Wait for the animation to finish
  };

  return (
    <div className={`landing-wrapper ${isExiting ? 'landing-exit' : ''}`}>
      <div className="ui-layer">
        <h1>
          <span className="welcome-text">Welcome to</span>
          <span className="flip-char">
            <span className="letter-w">M</span>
            <span className="letter-m">E</span>
          </span>
          <span className="flip-char">
            <span className="letter-w">M</span>
            <span className="letter-m">D</span>
          </span>
          <span className="flip-char">
            <span className="letter-w">M</span>
            <span className="letter-m">O</span>
          </span>
          <span className="flip-char">
            <span className="letter-w">M</span>
            <span className="letter-m">O</span>
          </span>
        </h1>
        <p className="subtitle">ALL YOU WANT IN ONE Placed.</p>
        <div className="controls">
          <button className="landing-btn" onClick={toggleGravity}>
            {gravityOn ? "Zero Gravity" : "Restore Gravity"}
          </button>
          <button className="landing-btn" onClick={handleEnter}>
            Enter your World
          </button>
          <button className="landing-btn" onClick={handleExplode}>
            Explode
          </button>
        </div>
      </div>
      <div id="scene-container" ref={sceneRef}></div>
    </div>
  );
};
