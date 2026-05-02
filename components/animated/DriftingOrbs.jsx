"use client";

const ORBS = [
  { size: 520, color: "rgba(40, 86, 248, 0.28)", x: "10%", y: "20%", duration: 72, delay: 0 },
  { size: 420, color: "rgba(192, 132, 252, 0.22)", x: "75%", y: "15%", duration: 88, delay: -20 },
  { size: 360, color: "rgba(84, 182, 255, 0.22)", x: "55%", y: "75%", duration: 96, delay: -40 },
  { size: 300, color: "rgba(255, 107, 157, 0.18)", x: "20%", y: "80%", duration: 78, delay: -10 }
];

export default function DriftingOrbs() {
  return (
    <div className="drifting-orbs" aria-hidden="true">
      {ORBS.map((orb, index) => (
        <span
          key={index}
          className={`drifting-orb drifting-orb-${index}`}
          style={{
            "--orb-size": `${orb.size}px`,
            "--orb-color": orb.color,
            "--orb-x": orb.x,
            "--orb-y": orb.y,
            "--orb-duration": `${orb.duration}s`,
            "--orb-delay": `${orb.delay}s`
          }}
        />
      ))}
    </div>
  );
}
