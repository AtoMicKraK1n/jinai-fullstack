import { motion } from "framer-motion";

export const FloatingIcons = () => {
  const icons = [
    { src: "/gtavr.jpg", delay: 0 },
    { src: "/gowr.jpg", delay: 1 },
    { src: "/nfsr.jpg", delay: 2 },
    { src: "/gotr.jpg", delay: 3 },
    { src: "/codr.jpg", delay: 4 },
    { src: "/minecraftr.jpg", delay: 5 },
  ];

  const getRandomPosition = (index: number) => {
    // Create a grid-like distribution
    const row = Math.floor(index / 2);
    const col = index % 2;
    
    // Add some randomness to the grid positions
    const baseX = col * 50 + 10; // 10% padding from edges
    const baseY = row * 33 + 10; // 10% padding from edges
    
    const randomX = baseX + (Math.random() * 20 - 10); // ±10% random adjustment
    const randomY = baseY + (Math.random() * 20 - 10); // ±10% random adjustment
    
    return {
      left: `${Math.min(Math.max(randomX, 5), 85)}%`, // Ensure within 5-85% range
      top: `${Math.min(Math.max(randomY, 5), 85)}%`, // Ensure within 5-85% range
    };
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((icon, index) => (
        <motion.img
          key={index}
          src={icon.src}
          alt="Game Icon"
          className="absolute w-64 h-64 rounded-full object-cover floating-icon opacity-60"
          style={getRandomPosition(index)}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.6, scale: 1 }}
          transition={{
            delay: icon.delay * 0.2,
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            repeatDelay: 3,
          }}
        />
      ))}
    </div>
  );
};