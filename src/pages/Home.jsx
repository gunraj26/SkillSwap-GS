import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

export default function Home() {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  })

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          {/* Background SVG pattern */}
          <svg
            className="absolute w-full h-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="#f2a93b"
                  strokeWidth="0.5"
                  strokeOpacity="0.1"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Animated circles */}
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bg-[#f2a93b]/5 rounded-full"
              style={{
                width: Math.random() * 100 + 50,
                height: Math.random() * 100 + 50,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, Math.random() * 100 - 50],
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: Math.random() * 5 + 5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}
        </div>
        
        <motion.div
          className="text-center z-10"
          initial={{ opacity: 1, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-6xl font-bold text-[#f2a93b] mb-4">SKILLSWAP</h1>
          <p className="text-xl text-gray-300">Exchange Skills, Grow Together</p>
        </motion.div>
      </div>

      {/* About Section */}
      <motion.div
        ref={ref}
        className="py-20 bg-[#111122]"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-8 text-[#f2a93b]">Why SkillSwap?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              className="bg-[#1A1A3F] p-6 rounded-lg shadow-md border border-[#f2a93b]/30"
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="text-xl font-semibold mb-4 text-[#f2a93b]">Learn and Teach Skills</h3>
              <p className="text-gray-300">
                We believe in the power of skill exchange. Our platform connects people
                who want to learn with those who want to teach, creating a community
                of continuous learning and growth.
              </p>
            </motion.div>
            <motion.div
              className="bg-[#1A1A3F] p-6 rounded-lg shadow-md border border-[#f2a93b]/30"
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="text-xl font-semibold mb-4 text-[#f2a93b]">Make Friends</h3>
              <p className="text-gray-300">
                List your skills or find skills you want to learn. Connect with others,
                arrange skill exchanges, and grow together. It's that simple!
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}