import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  FaCalendarPlus,
  FaCar,
  FaTools,
  FaClock,
  FaPhone,
  FaCheckCircle,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const CustomerAppointments = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [formData, setFormData] = useState({
    vehicle_number: "",
    vehicle_type: "",
    service_type: "",
    phone_number: "",
    appointment_date: "",
    appointment_time: "",
    additional_notes: "",
  });

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  // Check if user is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));
        if (!user) {
          console.log("No user found in localStorage");
          navigate("/login");
          return;
        }
        console.log("User found in localStorage:", user);

        // Set default phone number if available
        if (user.phone_number) {
          setFormData((prev) => ({
            ...prev,
            phone_number: user.phone_number,
          }));
        }

        // If we have user data, fetch appointments
        fetchAppointments();
        fetchServiceTypes();
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("user");
        navigate("/login");
      }
    };

    checkAuth();
  }, []);

  // Fetch available time slots when date changes
  useEffect(() => {
    if (formData.appointment_date) {
      fetchAvailableTimeSlots(formData.appointment_date);
    } else {
      setAvailableTimeSlots([]); // Clear time slots if no date is selected
    }
  }, [formData.appointment_date]);

  // Fetch service types from the API
  const fetchServiceTypes = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:3000/api/services", {
        withCredentials: true,
      });

      // Store all services
      setAllServices(response.data);

      // Initially set serviceTypes as empty since no vehicle is selected
      setServiceTypes([]);
      console.log("All services:", response.data);
    } catch (error) {
      console.error("Error fetching service types:", error);
      setError("Failed to fetch service types");
    } finally {
      setLoading(false);
    }
  };

  // Add this function to filter services when vehicle type changes
  const handleVehicleTypeChange = (selectedVehicleType) => {
    setFormData((prev) => ({
      ...prev,
      vehicle_type: selectedVehicleType,
      service_type: "", // Reset service type when vehicle type changes
    }));

    // Filter services based on selected vehicle type
    const filteredServices = allServices.filter(
      (service) => service.vehicle_type === selectedVehicleType
    );

    // Extract unique service names
    const uniqueServices = [
      ...new Set(filteredServices.map((service) => service.name)),
    ];
    const formattedServices = uniqueServices.map((name) => ({
      service_type_id: name,
      type_name: name,
    }));

    setServiceTypes(formattedServices);
  };

  // Fetch available time slots
  const fetchAvailableTimeSlots = async (date) => {
    try {
      setLoading(true);
      setError("");

      // All possible time slots
      const allTimeSlots = [
        "08:00",
        "09:30",
        "11:00",
        "12:30",
        "14:00",
        "15:30",
      ];

      // Get available slots from API
      const response = await axios.get(
        `http://localhost:3000/api/appointments/available-slots/${date}`,
        {
          withCredentials: true,
        }
      );

      // Format all time slots for display, marking which ones are available
      const formattedSlots = allTimeSlots.map((slot) => {
        const [hours, minutes] = slot.split(":");
        const time = new Date();
        time.setHours(parseInt(hours), parseInt(minutes));

        // Check if this slot is available (included in the API response)
        const isAvailable = response.data.available_slots.includes(slot);

        return {
          value: slot,
          label: time
            .toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
            .toUpperCase(),
          isAvailable: isAvailable,
        };
      });

      // Sort slots by time
      formattedSlots.sort((a, b) => {
        const timeA = a.value.split(":").map(Number);
        const timeB = b.value.split(":").map(Number);
        return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
      });

      setAvailableTimeSlots(formattedSlots);
    } catch (error) {
      console.error("Error fetching time slots:", error);
      setError(
        error.response?.data?.message || "Failed to fetch available time slots"
      );
      setAvailableTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's appointments
  const fetchAppointments = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        console.log("No user found in localStorage");
        navigate("/login");
        return;
      }
      console.log("Fetching appointments for user:", user.user_id);

      const response = await axios.get(
        `http://localhost:3000/api/appointments/user/${user.id}`,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Appointments fetched successfully:", response.data);
      setAppointments(response.data);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log("Unauthorized/Forbidden - redirecting to login");
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          `Failed to fetch appointments: ${
            error.response?.data?.message || error.message
          }`
        );
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await axios.post(
        "http://localhost:3000/api/appointments",
        {
          vehicle_number: formData.vehicle_number,
          vehicle_type: formData.vehicle_type,
          service_type: formData.service_type,
          phone_number: formData.phone_number,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
        },
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Appointment created:", response.data);
      setSuccess("✅ Appointment created successfully!");
      setFormData({
        vehicle_number: "",
        vehicle_type: "",
        service_type: "",
        phone_number: "",
        appointment_date: "",
        appointment_time: "",
        additional_notes: "",
      });
      fetchAppointments(); // Refresh the appointments list
    } catch (error) {
      console.error("Error creating appointment:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem("user");
        navigate("/login");
      } else {
        setError(
          error.response?.data?.message || "Failed to create appointment"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
      case "Confirmed":
        return "bg-green-500/20 text-green-400 border border-green-500/30";
      case "In Progress":
        return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
      case "Completed":
        return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
      case "Cancelled":
        return "bg-red-500/20 text-red-400 border border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
    }
  };

  const formatDateTime = (date, time) => {
    if (!date) return "Not specified";
    const formattedDate = new Date(date).toLocaleDateString();
    return time ? `${formattedDate} at ${time}` : formattedDate;
  };

  const renderAppointments = () => {
    return appointments.map((appointment) => (
      <motion.div
        key={appointment.appointment_id}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        className="bg-[#12133a] rounded-lg shadow-xl p-6 mb-6 border border-gray-800 hover:border-green-500/20 transition-all duration-300"
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center text-white">
              <FaCar className="mr-3 text-green-500" />
              {appointment.vehicle_number} - {appointment.vehicle_type}
            </h3>
            <p className="text-lg text-gray-300 flex items-center mt-3">
              <FaTools className="mr-3 text-green-500" />
              {appointment.service_type}
            </p>
            <p className="text-lg text-gray-300 flex items-center mt-3">
              <FaClock className="mr-3 text-green-500" />
              {formatDateTime(
                appointment.appointment_date,
                appointment.appointment_time
              )}
            </p>
            {appointment.phone_number && (
              <p className="text-lg text-gray-300 flex items-center mt-3">
                <FaPhone className="mr-3 text-green-500" />
                {appointment.phone_number}
              </p>
            )}
          </div>
          <span
            className={`px-4 py-2 rounded-lg text-base font-medium ${getStatusBadgeColor(
              appointment.status_
            )}`}
          >
            {appointment.status_}
          </span>
        </div>
        {appointment.status_updated_at && (
          <div className="text-base text-gray-400 mt-3 pt-3 border-t border-gray-700">
            <p>
              Last Updated:{" "}
              {new Date(appointment.status_updated_at).toLocaleString()}
            </p>
          </div>
        )}
      </motion.div>
    ));
  };

  return (
    <div className="min-h-screen text-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Book an Appointment
          </h1>
          <p className="mt-2 text-xl text-gray-300">
            Schedule a service appointment for your vehicle
          </p>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg text-lg"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-green-900/30 border border-green-500/30 text-green-400 rounded-lg text-lg"
          >
            {success}
          </motion.div>
        )}

        {/* Appointment Booking Form */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="bg-[#12133a] rounded-xl shadow-xl p-8 mb-12 border border-gray-800"
        >
          <h2 className="text-2xl font-bold text-green-400 mb-6">
            New Appointment
          </h2>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-lg font-medium text-white mb-2">
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={formData.vehicle_number}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_number: e.target.value })
                  }
                  placeholder="Enter vehicle number"
                  pattern="^(?:\d{1,3}-\d{4}|[A-Z]{2,3}-\d{4})$"
                  title="Format should be like CAA-1234, NA-4567, 300-2345, or 2-3424"
                  className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 text-white text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-white mb-2">
                  Vehicle Type
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => handleVehicleTypeChange(e.target.value)}
                  className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 text-white text-lg appearance-none"
                  required
                >
                  <option value="" disabled>
                    Select a vehicle type
                  </option>
                  <option value="Car" className="bg-[#0d0e24]">
                    Car
                  </option>
                  <option value="Van" className="bg-[#0d0e24]">
                    Van
                  </option>
                  <option value="SUV" className="bg-[#0d0e24]">
                    SUV
                  </option>
                  <option value="Lorry" className="bg-[#0d0e24]">
                    Lorry
                  </option>
                  <option value="Bus" className="bg-[#0d0e24]">
                    Bus
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-lg font-medium text-white mb-2">
                  Service Type
                </label>
                <select
                  value={formData.service_type}
                  onChange={(e) =>
                    setFormData({ ...formData, service_type: e.target.value })
                  }
                  className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 text-white text-lg appearance-none"
                  required
                  disabled={!formData.vehicle_type} // Disable if no vehicle type selected
                >
                  <option value="" disabled>
                    {!formData.vehicle_type
                      ? "Select a vehicle type first"
                      : "Select a service type"}
                  </option>
                  {serviceTypes.map((type) => (
                    <option
                      key={type.service_type_id}
                      value={type.type_name}
                      className="bg-[#0d0e24]"
                    >
                      {type.type_name}
                    </option>
                  ))}
                </select>
                {formData.vehicle_type && serviceTypes.length === 0 && (
                  <p className="mt-2 text-yellow-400 text-sm">
                    No services available for this vehicle type
                  </p>
                )}
              </div>

              <div>
                <label className="block text-lg font-medium text-white mb-2">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_number: e.target.value })
                  }
                  placeholder="Enter phone number"
                  pattern="^0\d{9}$"
                  title="Phone number must start with 0 and contain exactly 10 digits (e.g., 0712345678)"
                  className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 text-white text-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-white mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.appointment_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      appointment_date: e.target.value,
                    })
                  }
                  className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 text-white text-lg"
                  min={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>

              <div>
                <label className="block text-lg font-medium text-white mb-2">
                  Time Slot
                </label>
                {!formData.appointment_date ? (
                  <div className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg text-gray-500 text-lg">
                    Select a date first
                  </div>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg text-gray-500 text-lg">
                    Loading time slots...
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={formData.appointment_time}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          appointment_time: e.target.value,
                        })
                      }
                      className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 text-white text-lg appearance-none"
                      required
                    >
                      <option value="" disabled className="bg-[#0d0e24]">
                        Select a time slot
                      </option>
                      {availableTimeSlots.map((slot) => (
                        <option
                          key={slot.value}
                          value={slot.value}
                          disabled={!slot.isAvailable}
                          className={
                            !slot.isAvailable
                              ? "text-gray-500 bg-[#0d0e24]"
                              : "text-green-400 bg-[#0d0e24]"
                          }
                        >
                          {slot.label}{" "}
                          {!slot.isAvailable ? "(Booked)" : "(Available)"}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg
                        className="h-5 w-5 fill-current"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center">
                  <div className="flex items-center mr-4">
                    <span className="inline-block w-3 h-3 bg-green-500/30 border border-green-500 rounded-full mr-2"></span>
                    <span className="text-base text-gray-300">Available</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-gray-700 border border-gray-600 rounded-full mr-2"></span>
                    <span className="text-base text-gray-300">Booked</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-lg font-medium text-white mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={formData.additional_notes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      additional_notes: e.target.value,
                    })
                  }
                  rows="4"
                  className="w-full px-5 py-3 bg-[#0d0e24] border border-gray-700 rounded-lg focus:ring-green-500 focus:border-green-500 text-white text-lg"
                  placeholder="Any specific details about your service needs"
                ></textarea>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex justify-center items-center text-lg font-semibold shadow-lg transition-all duration-300"
              >
                {loading ? (
                  <span className="animate-spin h-6 w-6 mr-3 border-t-2 border-b-2 border-white rounded-full"></span>
                ) : (
                  <FaCalendarPlus className="mr-3 text-xl" />
                )}
                Book Appointment
              </button>
            </div>
          </form>
        </motion.div>

        {/* Appointments List */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          className="mb-12"
        >
          <h2 className="text-3xl font-bold text-green-400 mb-8">
            My Appointments
          </h2>
          {appointments.length === 0 ? (
            <div className="bg-[#12133a] rounded-lg shadow-xl p-8 text-center text-gray-400 text-lg border border-gray-800">
              You don't have any appointments yet.
            </div>
          ) : (
            <div className="space-y-6">{renderAppointments()}</div>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="bg-[#080919] text-white py-12 mt-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400 text-lg">
            &copy; 2024 SAS Lanka Service Centre. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CustomerAppointments;
