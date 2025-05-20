import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  FaTools,
  FaCar,
  FaOilCan,
  FaTachometerAlt,
  FaCog,
  FaShieldAlt,
  FaStar,
  FaPercentage,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

// Import service image - create a new imports for your actual images
const servicesHeroImage = "/src/assets/images/IMG_3138.jpg";
const serviceDetailImage = "/src/assets/images/service-detail.jpg";

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch services with active promotions
        const response = await axios.get(
          "http://localhost:3000/api/services/with-promotions"
        );
        setServices(response.data);

        // Extract unique vehicle types
        const types = [
          ...new Set(response.data.map((service) => service.vehicle_type)),
        ];
        setVehicleTypes(types);
      } catch (err) {
        console.error("Error fetching services:", err);
        setError("Failed to load services. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  // Filter services based on selected vehicle type
  const filteredServices = services.filter(
    (service) =>
      selectedVehicleType === "all" ||
      service.vehicle_type === selectedVehicleType
  );


  // Calculate discounted price
  const calculateDiscountedPrice = (price, discountPercentage) => {
    return price - price * (discountPercentage / 100);
  };

  // Check promotion status
  const getPromotionStatus = (promotion) => {
    if (!promotion || !promotion.is_active) return null;

    const today = new Date();
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);

    if (today < startDate) return "upcoming";
    if (today > endDate) return "expired";
    return "active";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <section className="relative h-[50vh] flex items-center">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${servicesHeroImage})` }}
        ></div>
        <div className="absolute inset-0 z-1 bg-black opacity-70"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="max-w-3xl"
          >
            <h1
              className="text-5xl font-bold mb-4 text-shadow-lg"
              style={{ textShadow: "0 4px 8px rgba(0,0,0,0.8)" }}
            >
              OUR SERVICES
            </h1>
            <p
              className="text-xl mb-8 text-gray-200"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
            >
              Premium automotive care tailored to your vehicle's specific needs
            </p>
          </motion.div>
        </div>
      </section>

      {/* Available Services Section */}
      <section className="py-20 bg-[#0a0b1e]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16 max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold mb-6 text-green-400">
              Available Services
            </h2>
            <p className="text-gray-300">
              Browse our comprehensive range of services with current pricing
              and promotions. Select a vehicle type to filter services specific
              to your needs.
            </p>

            {/* Filter Options */}
            <div className="mt-8">
              {/* Vehicle Type Filter */}
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => setSelectedVehicleType("all")}
                  className={`px-4 py-2 rounded-full ${
                    selectedVehicleType === "all"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  All Vehicles
                </button>
                <button
                  onClick={() => setSelectedVehicleType("Car")}
                  className={`px-4 py-2 rounded-full ${
                    selectedVehicleType === "Car"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  Car
                </button>
                <button
                  onClick={() => setSelectedVehicleType("SUV")}
                  className={`px-4 py-2 rounded-full ${
                    selectedVehicleType === "SUV"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  SUV
                </button>
                <button
                  onClick={() => setSelectedVehicleType("Van")}
                  className={`px-4 py-2 rounded-full ${
                    selectedVehicleType === "Van"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  Van
                </button>
                <button
                  onClick={() => setSelectedVehicleType("Bus")}
                  className={`px-4 py-2 rounded-full ${
                    selectedVehicleType === "Bus"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  Bus
                </button>
                <button
                  onClick={() => setSelectedVehicleType("Lorry")}
                  className={`px-4 py-2 rounded-full ${
                    selectedVehicleType === "Lorry"
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-300"
                  }`}
                >
                  Lorry
                </button>
              </div>
            </div>
          </motion.div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
              <p className="mt-4 text-gray-400">Loading services...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map((service) => {
                const activePromotion = service.promotions?.find(
                  (promo) => getPromotionStatus(promo) === "active"
                );
                const upcomingPromotion =
                  !activePromotion &&
                  service.promotions?.find(
                    (promo) => getPromotionStatus(promo) === "upcoming"
                  );

                const hasActiveDiscount = !!activePromotion;
                const hasUpcomingDiscount = !!upcomingPromotion;

                const originalPrice = parseFloat(service.price);
                const discountedPrice = hasActiveDiscount
                  ? calculateDiscountedPrice(
                      originalPrice,
                      activePromotion.discount_percentage
                    )
                  : originalPrice;

                return (
                  <motion.div
                    key={service.service_id}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: {
                        opacity: 1,
                        y: 0,
                        transition: { duration: 0.5 },
                      },
                    }}
                    className={`bg-[#12133a] p-8 rounded-lg hover:bg-[#1a1b4b] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 relative ${
                      hasActiveDiscount
                        ? "border-2 border-green-500"
                        : hasUpcomingDiscount
                        ? "border-2 border-blue-500"
                        : ""
                    }`}
                  >
                    {hasActiveDiscount && (
                      <div className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center absolute -top-3 -right-3">
                        <FaPercentage className="mr-1" />{" "}
                        {activePromotion.discount_percentage}% OFF
                      </div>
                    )}
                    {hasUpcomingDiscount && (
                      <div className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center absolute -top-3 -right-3">
                        <FaPercentage className="mr-1" />{" "}
                        {upcomingPromotion.discount_percentage}% SOON
                      </div>
                    )}
                    <div className="text-green-500 mb-4">
                      <FaCog className="text-4xl" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{service.name}</h3>
                    <p className="text-gray-400 mb-4">
                      {service.description ||
                        "Professional service for your vehicle."}
                    </p>

                    {hasActiveDiscount ? (
                      <div className="mb-4">
                        <span className="text-gray-400 line-through mr-2">
                          Rs.{originalPrice.toFixed(2)}
                        </span>
                        <span className="text-green-500 font-bold text-xl">
                          Rs.{discountedPrice.toFixed(2)}
                        </span>
                        <p className="text-xs text-green-400 mt-1">
                          Promotion valid until{" "}
                          {new Date(
                            activePromotion.end_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    ) : hasUpcomingDiscount ? (
                      <div className="mb-4">
                        <span className="text-gray-300 font-bold text-xl">
                          Rs.{originalPrice.toFixed(2)}
                        </span>
                        <p className="text-xs text-blue-400 mt-1">
                          {upcomingPromotion.discount_percentage}% discount
                          starting{" "}
                          {new Date(
                            upcomingPromotion.start_date
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-300 font-bold text-xl mb-4">
                        Rs.{originalPrice.toFixed(2)}
                      </p>
                    )}
                    <button
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                      onClick={() => navigate("/appointments")}
                    >
                      Book Now
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {filteredServices.length === 0 && !loading && !error && (
            <div className="text-center py-12">
              <p className="text-gray-400">
                No services found for the selected filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-[#0d0e24]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold mb-4 text-green-400">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              Find answers to common questions about our services, appointments,
              and more.
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-6">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="bg-[#12133a] p-6 rounded-lg"
            >
              <h3 className="text-xl font-bold mb-2 text-white">
                How often should I service my vehicle?
              </h3>
              <p className="text-gray-400">
                We recommend servicing your vehicle at least once every 6 months or every 5,000–7,500 km, whichever comes first.
                Regular maintenance helps prevent breakdowns and extends
                the life of your vehicle.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="bg-[#12133a] p-6 rounded-lg"
            >
              <h3 className="text-xl font-bold mb-2 text-white">
                Do you use genuine spare parts?
              </h3>
              <p className="text-gray-400">
                Yes, we use only high-quality, genuine spare parts from trusted suppliers.
                This ensures compatibility, durability, and optimal performance for your vehicle.


              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="bg-[#12133a] p-6 rounded-lg"
            >
              <h3 className="text-xl font-bold mb-2 text-white">
                How long does a typical service take?
              </h3>
              <p className="text-gray-400">
                Service times vary depending on the type of service and your
                vehicle's specific needs. Routine maintenance services typically
                take 1-2 hours, while more complex repairs may take longer.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#080919] text-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            &copy; 2024 SAS Lanka Service Centre. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Services;
