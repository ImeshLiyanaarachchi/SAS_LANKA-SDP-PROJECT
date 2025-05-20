import React from 'react';
import { motion } from 'framer-motion';
import { FaCarAlt, FaTools, FaUserShield, FaHistory, FaMapMarkerAlt, FaPhone, FaEnvelope, FaStar } from 'react-icons/fa';

// Import images for About Us page
const serviceCenter1 = '/src/assets/images/IMG_3129.jpg';
const serviceCenter2 = '/src/assets/images/IMG_3138.jpg';

const AboutUs = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };
  
  const services = [
    {
      icon: <FaCarAlt className="text-5xl" />,
      title: 'Vehicle Maintenance',
      description: 'Regular maintenance and servicing for all vehicle makes and models to ensure optimal performance.'
    },
    {
      icon: <FaTools className="text-5xl" />,
      title: 'Repair Services',
      description: 'Comprehensive diagnostic and repair services by certified technicians using state-of-the-art equipment.'
    },
    {
      icon: <FaUserShield className="text-5xl" />,
      title: 'Quality Guarantee',
      description: 'All our services come with a satisfaction guarantee, ensuring peace of mind for our customers.'
    },
    {
      icon: <FaHistory className="text-5xl" />,
      title: 'Quick Turnaround',
      description: 'Efficient service delivery with minimum wait times and maximum transparency.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white text-lg">
      {/* Hero Section */}
      <section className="relative h-[60vh] flex items-center">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${serviceCenter1})` }}
        ></div>
        <div className="absolute inset-0 z-1 bg-black opacity-70"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="max-w-3xl"
          >
            <h1 className="text-6xl font-bold mb-4 text-shadow-lg" style={{ textShadow: "0 4px 8px rgba(0,0,0,0.8)" }}>SAS LANKA SERVICE CENTRE</h1>
            <p className="text-2xl mb-8 text-gray-200" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>Your trusted partner for premium vehicle service and maintenance in Sri Lanka.</p>
          </motion.div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-24 bg-[#0d0e24]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="lg:w-1/2"
            >
              <img 
                src={serviceCenter2} 
                alt="SAS Lanka Service Centre" 
                className="rounded-lg shadow-2xl w-full h-auto object-cover"
              />
            </motion.div>
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="lg:w-1/2"
            >
              <h2 className="text-4xl font-bold mb-8 text-green-400">Our Story</h2>
              <p className="text-xl text-gray-300 mb-8">
                Since 2010, SAS Lanka Service Centre has been providing top-tier automotive services to our valued customers in the Avissawella area. What started as a small workshop has now grown into a full-service facility equipped with the latest tools and technology.
              </p>
              <p className="text-xl text-gray-300 mb-8">
                As an authorized Mobil service center, we maintain the highest standards of quality and reliability. Our team of certified technicians brings decades of combined experience to ensure your vehicle receives the best care possible.
              </p>
              <p className="text-xl text-gray-300">
                We pride ourselves on building long-lasting relationships with our customers through honest service, transparent pricing, and exceptional workmanship.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-[#0a0b1e]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-6 text-green-400">Our Services</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We offer a comprehensive range of automotive services to keep your vehicle running at its best. From routine maintenance to complex repairs, our team has you covered.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <motion.div 
                key={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    transition: { duration: 0.5, delay: index * 0.1 }
                  }
                }}
                className="bg-[#12133a] p-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 hover:transform hover:-translate-y-2"
              >
                <div className="text-green-500 text-4xl mb-6">{service.icon}</div>
                <h3 className="text-2xl font-bold mb-4">{service.title}</h3>
                <p className="text-lg text-gray-400">{service.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 bg-[#0d0e24]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-6 text-green-400">Why Choose Us</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              SAS Lanka Service Centre sets itself apart through a commitment to excellence, customer satisfaction, and professional expertise.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="bg-[#12133a] p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4 text-green-400">Certified Technicians</h3>
              <p className="text-lg text-gray-300">
                Our team consists of factory-trained professionals with extensive experience in handling all types of vehicles and repair scenarios.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center text-lg text-gray-300">
                  <FaStar className="text-green-500 mr-2 text-xs" />
                  Factory-certified training
                </li>
                <li className="flex items-center text-lg text-gray-300">
                  <FaStar className="text-green-500 mr-2 text-xs" />
                  Ongoing professional development
                </li>
              </ul>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="bg-[#12133a] p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4 text-green-400">Genuine Parts</h3>
              <p className="text-lg text-gray-300">
                We use only OEM or high-quality aftermarket parts to ensure the longevity and reliability of your vehicle after service.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center text-lg text-gray-300">
                  <FaStar className="text-green-500 mr-2 text-xs" />
                  Manufacturer-approved components
                </li>
                <li className="flex items-center text-lg text-gray-300">
                  <FaStar className="text-green-500 mr-2 text-xs" />
                  Extended warranties on parts
                </li>
              </ul>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="bg-[#12133a] p-8 rounded-lg shadow-lg"
            >
              <h3 className="text-2xl font-bold mb-4 text-green-400">Best Price in the Area</h3>
              <p className="text-lg text-gray-300">
                We offer competitive rates without compromising on quality. With clear pricing and no hidden fees, you get the best value for your money in the Avissawella area.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center text-lg text-gray-300">
                  <FaStar className="text-green-500 mr-2 text-xs" />
                  Competitive, affordable service rates
                </li>
                <li className="flex items-center text-lg text-gray-300">
                  <FaStar className="text-green-500 mr-2 text-xs" />
                  No hidden fees or surprise charges
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="bg-[#080919] text-white py-12 border-t border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
          <p className="text-lg text-gray-400 mb-8">© 2025 SAS Lanka Service Centre. All rights reserved.</p>
          <div className="flex justify-center space-x-8">
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs; 