import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import bgImage from "../../assets/images/bg3.jpg";

const Home = () => {
  const [count1, setCount1] = useState(0);
  const [count2, setCount2] = useState(0);
  const [count3, setCount3] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      if (count1 < 1000) setCount1((prev) => Math.min(prev + 20, 1000));
      if (count2 < 50) setCount2((prev) => Math.min(prev + 1, 50));
      if (count3 < 95) setCount3((prev) => Math.min(prev + 2, 95));
    }, 50);

    return () => clearInterval(interval);
  }, [count1, count2, count3]);

  return (
    <div className="min-h-screen bg-[#0a0b1e]">
      {/* Hero Section */}
      <div className="relative h-screen">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={bgImage}
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/70" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl pl-8 md:pl-16 lg:pl-32 mt-16"
          >
            <h1
              className="text-5xl md:text-7xl font-bold text-white mb-6"
              style={{ textShadow: "0 4px 8px rgba(0,0,0,0.8)" }}
            >
              YOUR CAR OUR
              <br />
              PRIORITY
            </h1>
            <p
              className="text-xl md:text-2xl text-white/90 mb-8 max-w-xl"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.7)" }}
            >
              Experience reliable services for your vehicle maintenance
            </p>
            <div className="flex gap-6">
              <Link to="/services">
                <button className="bg-green-500 text-white px-8 py-3 rounded hover:bg-green-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
                  Get Started
                </button>
              </Link>
              <Link to="/about-us">
              <button className="border border-white text-white px-8 py-3 rounded hover:bg-white/10 transition-all duration-300 shadow-lg">
                Learn More
              </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-20 bg-[#0d0e24]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-white mb-2">
                {count1}+
              </div>
              <div className="text-white/60">Satisfied Clients</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-white mb-2">
                {count2}+
              </div>
              <div className="text-white/60">Premium Services</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-white mb-2">
                {count3}%
              </div>
              <div className="text-white/60">Customer Satisfaction</div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="py-20 bg-[#0a0b1e]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-white text-center mb-16"
          >
            Our Premium Services
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Brake & Suspension Service",
                desc: "Safety-focused tuning for stopping power and comfort",
              },
              {
                title: "Performance Tuning",
                desc: "Optimize your vehicle performance",
              },
              {
                title: "Interior Detailing",
                desc: "Premium interior cleaning and restoration",
              },
              {
                title: "Battery & Electrical Check",
                desc: "Ensure optimal performance of your vehicle’s power system",
              },
              {
                title: "AC System Service",
                desc: "Cooling and air quality maintenance for interior comfort",
              },
              {
                title: "Technical Inspection",
                desc: "Thorough vehicle diagnostics",
              },
            ].map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-[#12133a] p-6 rounded-lg hover:bg-[#1a1b4b] transition-all duration-300"
              >
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {service.title}
                </h3>
                <p className="text-white/60">{service.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="py-20 bg-[#0d0e24]">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold text-white text-center mb-16"
          >
            Why Choose Us?
          </motion.h2>
          <div className="grid md:grid-cols-3 gap-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="text-green-500 mb-6">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">
                Expert Team
              </h3>
              <p className="text-white/60">
                Our certified professionals bring years of experience and
                expertise to every service
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-green-500 mb-6">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">
                Quick Service
              </h3>
              <p className="text-white/60">
                Fast turnaround times without compromising on quality or
                attention to detail
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center"
            >
              <div className="text-green-500 mb-6">
                <svg
                  className="w-12 h-12 mx-auto"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-4 text-white">
                Best Prices
              </h3>
              <p className="text-white/60">
                Competitive pricing with transparent costs and no hidden charges
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#080919] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">SAS LANKA</h3>
              <p className="text-white/60">Luxury automotive excellence</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-white/60 hover:text-white transition-colors duration-300"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-white/60 hover:text-white transition-colors duration-300"
                  >
                    Services
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-white/60 hover:text-white transition-colors duration-300"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-white/60 hover:text-white transition-colors duration-300"
                  >
                    Maintenance
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-white/60 hover:text-white transition-colors duration-300"
                  >
                    Detailing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-white/60 hover:text-white transition-colors duration-300"
                  >
                    Modifications
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-white/60">
                <li>No 59/4</li>
                <li> Miriswatta Puwakpitiya</li>
                <li>+94 82 220 444</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/60">
            <p>&copy; 2025 SAS Lanka. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
