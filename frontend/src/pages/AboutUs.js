import React from 'react';
import { motion } from 'framer-motion';

const AboutUs = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden relative">
    {/* Animated Background Elements (same as Home) */}
    <motion.div animate={{ x: [0, 100, 0], y: [0, -20, 0] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute top-20 left-10 opacity-20">
      <div className="text-6xl">🚗</div>
    </motion.div>
    <motion.div animate={{ x: [0, -150, 0], y: [0, 30, 0] }} transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 5 }} className="absolute top-40 right-20 opacity-20">
      <div className="text-5xl">🚙</div>
    </motion.div>
    <motion.div animate={{ x: [0, 80, 0], y: [0, -40, 0] }} transition={{ duration: 30, repeat: Infinity, ease: "linear", delay: 10 }} className="absolute bottom-32 left-32 opacity-20">
      <div className="text-4xl">🚕</div>
    </motion.div>
    <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 4, repeat: Infinity }} className="absolute top-20 right-32 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-600/20 rounded-full blur-3xl" />
    <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 6, repeat: Infinity, delay: 2 }} className="absolute bottom-32 left-20 w-80 h-80 bg-gradient-to-r from-indigo-400/20 to-blue-600/20 rounded-full blur-3xl" />

    {/* Main Content */}
    <div className="relative z-10 pt-24">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="mb-8 text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent">About Us</motion.span>
        </h1>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="mb-8 text-center">
  <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6">
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent">About Us</motion.span>
  </h1>
  <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.8 }} className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
    Welcome to <span className="font-bold text-blue-400">ParkPlaza</span>!<br />
    We are <a href="https://www.linkedin.com/in/abhinay-manikanti-9ab152275/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 underline">Abhinay Babu</a> and <a href="https://www.linkedin.com/in/marugani-reddi-sekhar-83644b253/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-400 underline">Reddi Sekhar</a>, passionate full-stack developers and technology enthusiasts.
  </motion.p>
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2, duration: 0.8 }} className="max-w-2xl mx-auto mt-8">
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-blue-300 mb-2">Our Mission</h2>
      <p className="text-gray-200">To revolutionize urban parking by providing smart, user-friendly, and secure solutions for drivers and property owners. We believe technology can make parking seamless, efficient, and stress-free for everyone.</p>
    </div>
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-blue-300 mb-2">Our Values</h2>
      <ul className="text-gray-200 list-disc list-inside">
        <li>Innovation & Modern Design</li>
        <li>Reliability & Security</li>
        <li>Customer-Centric Approach</li>
        <li>Transparency & Trust</li>
        <li>Continuous Learning</li>
      </ul>
    </div>
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-blue-300 mb-2">Our Skills</h2>
      <ul className="text-gray-200 grid grid-cols-2 gap-x-4 gap-y-1 text-left">
        <li>React, Redux, Framer Motion</li>
        <li>Node.js, Express, MongoDB</li>
        <li>REST APIs & WebSockets</li>
        <li>UI/UX & Responsive Design</li>
        <li>Cloud & DevOps (Render, Vercel)</li>
        <li>Payment Integration (Stripe, Razorpay)</li>
        <li>Map APIs (Leaflet, OSM, Google Maps)</li>
        <li>Testing & Automation</li>
      </ul>
    </div>
  </motion.div>
</motion.div>

<motion.div initial={{ opacity: 0, y: 50, rotateX: 15 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 2.5, duration: 1 }} className="max-w-4xl mx-auto mb-12">
  <div className="flex flex-col md:flex-row justify-center gap-8">
    <motion.div whileHover={{ scale: 1.05 }} className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 flex-1">
      <img src="/Abinay.jpg" alt="Abhinay" className="mx-auto rounded-full w-24 h-24 mb-2 object-cover" />
      <div className="font-bold text-blue-300 text-lg">Abhinay Babu</div>
      <div className="text-gray-200 text-sm mb-2">Full Stack Developer, UI/UX Designer</div>
      <p className="text-gray-300 text-sm mb-2">Abhinay specializes in frontend engineering, UI/UX, and cloud deployment. He loves building beautiful, scalable apps and is always exploring new tech.</p>
      <a href="https://www.linkedin.com/in/abhinay-manikanti-9ab152275/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">LinkedIn</a>
    </motion.div>
    <motion.div whileHover={{ scale: 1.05 }} className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8 flex-1">
      <img src="/mrs1.jpg" alt="Reddi Sekhar" className="mx-auto rounded-full w-24 h-24 mb-2 object-cover" />
      <div className="font-bold text-blue-300 text-lg">Reddi Sekhar</div>
      <div className="text-gray-200 text-sm mb-2">Backend Developer, Cloud Architect</div>
      <p className="text-gray-300 text-sm mb-2">Reddi Sekhar is passionate about backend systems, databases, and cloud infrastructure. He ensures everything runs smoothly and securely behind the scenes.</p>
      <a href="https://www.linkedin.com/in/marugani-reddi-sekhar-83644b253/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">LinkedIn</a>
    </motion.div>
  </div>
</motion.div>

<motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 3, duration: 1 }} className="max-w-2xl mx-auto text-center mb-12">
  <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
    <h2 className="text-2xl font-bold text-blue-300 mb-2">Contact & Collaboration</h2>
    <p className="text-gray-200">Interested in working with us, or have feedback? Reach out via <a href="mailto:manikantiabhinay@gmail.com" className="text-blue-400 underline">manikantiabhinay@gmail.com</a> or connect on LinkedIn. We love collaborating on new ideas and projects!</p>
  </div>
</motion.div>
        </motion.div>
        </div>
    </div>
);

export default AboutUs;
