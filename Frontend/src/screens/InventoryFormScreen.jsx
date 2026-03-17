import axios from "axios";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { SERVER_URL } from "../router";

function InventoryForm() {
  const [isLoading, seELoading] = useState(false);
  const [isError, setError] = useState(null);
  const [isSuccess, setSuccess] = useState(false);
  const [allLocations, setAllLocations] = useState([]);
  const [manufacturer, setManufacturer] = useState([]);

  const [data] = useOutletContext();
  const [formData, setFormData] = useState({
    createdBy: data.user._id,
    title: "",
    description: "",
    serialNo: "",
    manufacturer: "",
    locationId: "",
    model: "",
    dateOfPurchase: "",
    warrantyMonths: "",
    status: "not in use",
    user: "normal user",
    rackMountable: false,
    isPart: false,
  });

  const fetchNecessaryData = async () => {
    try {
      const manufacturersRes = await axios.get(`${SERVER_URL}/api/v1/brands`);
      const locationsRes = await axios.get(`${SERVER_URL}/api/v1/location`);
      setAllLocations(locationsRes.data);
      setManufacturer(manufacturersRes.data);
      if (locationsRes.data.length > 0 && manufacturersRes.data.length > 0) {
        setFormData((prev) => ({
          ...prev,
          manufacturer: manufacturersRes.data[0]._id,
          locationId: locationsRes.data[0]._id,
        }));
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchNecessaryData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    seELoading(true);
    try {
      if (isError) setError(false);
      if (isSuccess) setSuccess(false);

      const { status } = await axios.post(
        `${SERVER_URL}/api/v1/products/`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (status === 201) {
        setSuccess(true);
        setFormData({
          ...formData,
          title: "",
          description: "",
          serialNo: "",
          model: "",
          dateOfPurchase: "",
          warrantyMonths: "",
          rackMountable: false,
          isPart: false,
        });
      }
    } catch (e) {
      setError(e.response?.data?.error || e.response?.data?.message || "Error while adding new item");
      console.log(e);
    } finally {
      seELoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto my-8">
      {isError && (
        <div className="mb-3 px-3 py-1 border-2 border-yellow-600 bg-yellow-100 rounded-md text-yellow-800">
          {isError}
        </div>
      )}
      {isSuccess && (
        <div className="mb-3 px-3 py-1 border-2 border-green-600 bg-green-100 rounded-md text-green-900">
          {"New Product added to inventory successfully"}
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="title" className="block mb-2 font-semibold">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="description" className="block mb-2 font-semibold">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="serialNo" className="block mb-2 font-semibold">
          Serial Number
        </label>
        <input
          type="text"
          id="serialNo"
          name="serialNo"
          value={formData.serialNo}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="manufacturer" className="block mb-2 font-semibold">
          Manufacturer
        </label>
        <select
          id="manufacturer"
          name="manufacturer"
          value={formData.manufacturer}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        >
          {manufacturer.map((man) => (
            <option key={man._id} value={man._id}>
              {man.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label htmlFor="locationId" className="block mb-2 font-semibold">
          Location
        </label>
        <select
          id="locationId"
          name="locationId"
          value={formData.locationId}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        >
          {allLocations.map((loc) => (
            <option key={loc._id} value={loc._id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label htmlFor="model" className="block mb-2 font-semibold">
          Model
        </label>
        <input
          type="text"
          id="model"
          name="model"
          value={formData.model}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="dateOfPurchase" className="block mb-2 font-semibold">
          Date of Purchase
        </label>
        <input
          type="date"
          id="dateOfPurchase"
          name="dateOfPurchase"
          value={formData.dateOfPurchase}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="warrantyMonths" className="block mb-2 font-semibold">
          Warranty Months
        </label>
        <input
          type="number"
          id="warrantyMonths"
          name="warrantyMonths"
          value={formData.warrantyMonths}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label htmlFor="status" className="block mb-2 font-semibold">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        >
          <option value="repair">Repair</option>
          <option value="in use">In Use</option>
          <option value="not in use">Not in Use</option>
        </select>
      </div>
      <div className="mb-4">
        <label htmlFor="user" className="block mb-2 font-semibold">
          User
        </label>
        <select
          id="user"
          name="user"
          value={formData.user}
          onChange={handleChange}
          required
          className="border rounded px-4 py-2 w-full"
        >
          <option value="normal user">Normal User</option>
          <option value="department">Department</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div className="mb-4 flex gap-4 items-center">
        <label htmlFor="rackMountable" className="block font-semibold">
          Rack Mountable
        </label>
        <input
          type="checkbox"
          id="rackMountable"
          name="rackMountable"
          checked={formData.rackMountable}
          onChange={handleChange}
          className="w-5 h-5"
        />
      </div>
      <div className="mb-4 flex gap-4 items-center">
        <label htmlFor="isPart" className="block font-semibold">
          Is Part
        </label>
        <input
          type="checkbox"
          id="isPart"
          name="isPart"
          checked={formData.isPart}
          onChange={handleChange}
          className="w-5 h-5"
        />
      </div>
      <button
        disabled={isLoading}
        type="submit"
        className="w-full bg-slate-700 text-white px-4 py-3 rounded-md hover:bg-slate-800 transition-colors font-bold text-lg"
      >
        {isLoading ? "Adding Product..." : "Add Product"}
      </button>
    </form>
  );
}

export default InventoryForm;
