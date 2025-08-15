import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ContactUs = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSubmitted(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSubmitted(true);
        setForm({ name: '', email: '', message: '' });
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send message. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  };

  return (
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
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.8 }} className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-600 bg-clip-text text-transparent">Contact Us</motion.span>
          </h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.5, duration: 0.8 }} className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            We'd love to hear from you! Fill out the form below and we'll get back to you soon.<br />
            You can also reach us on LinkedIn:
            <br />
            <a href="https://www.linkedin.com/in/abhinay-manikanti-9ab152275/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">Abhinay Babu</a> &nbsp;|&nbsp;
            <a href="https://www.linkedin.com/in/marugani-reddi-sekhar-83644b253/" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold">Reddi Sekhar</a>&nbsp;|&nbsp;
          </motion.p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 50, rotateX: 15 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 2, duration: 1 }} className="max-w-2xl mx-auto mb-12">
          <motion.form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl p-8" initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }}>
            <input type="text" name="name" placeholder="Your Name" value={form.name} onChange={handleChange} className="w-full mb-4 px-4 py-2 border rounded" required />
            <input type="email" name="email" placeholder="Your Email" value={form.email} onChange={handleChange} className="w-full mb-4 px-4 py-2 border rounded" required />
            <textarea name="message" placeholder="Your Message" value={form.message} onChange={handleChange} className="w-full mb-4 px-4 py-2 border rounded" rows={5} required />
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </button>
            {submitted && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-green-400 font-semibold">
                Thank you! We'll be in touch soon.
              </motion.div>
            )}
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 text-red-400 font-semibold">
                {error}
              </motion.div>
            )}
          </motion.form>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactUs;
