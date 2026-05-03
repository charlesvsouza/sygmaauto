import { useEffect, useState } from 'react';
import { vehiclesApi, customersApi } from '../api/client';
import { formatPlate } from '../lib/masks';
import {
  Car,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  User,
  X,
  Bell,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [formData, setFormData] = useState({
    customerId: '',
    plate: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    km: '',
    vin: '',
    notes: '',
    lastMaintenanceKm: '',
    lastMaintenanceDate: '',
    maintenanceIntervalKm: '',
    maintenanceIntervalDays: '',
  });

  const isMaintenanceDue = (vehicle: any): boolean => {
    const today = new Date();
    if (vehicle.maintenanceIntervalKm && vehicle.km != null && vehicle.lastMaintenanceKm != null) {
      if (vehicle.km >= vehicle.lastMaintenanceKm + vehicle.maintenanceIntervalKm) return true;
    }
    if (vehicle.maintenanceIntervalDays && vehicle.lastMaintenanceDate) {
      const nextDate = new Date(vehicle.lastMaintenanceDate);
      nextDate.setDate(nextDate.getDate() + vehicle.maintenanceIntervalDays);
      if (today >= nextDate) return true;
    }
    return false;
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [vehiclesRes, customersRes] = await Promise.all([
        vehiclesApi.getAll(),
        customersApi.getAll(),
      ]);
      setVehicles(vehiclesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error('Falha ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : undefined,
        km: formData.km ? parseInt(formData.km) : undefined,
        lastMaintenanceKm: formData.lastMaintenanceKm ? parseInt(formData.lastMaintenanceKm) : undefined,
        lastMaintenanceDate: formData.lastMaintenanceDate || undefined,
        maintenanceIntervalKm: formData.maintenanceIntervalKm ? parseInt(formData.maintenanceIntervalKm) : undefined,
        maintenanceIntervalDays: formData.maintenanceIntervalDays ? parseInt(formData.maintenanceIntervalDays) : undefined,
      };
      if (editingVehicle) {
        await vehiclesApi.update(editingVehicle.id, data);
      } else {
        await vehiclesApi.create(data);
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Falha ao salvar veículo:', error);
    }
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setFormData({
      customerId: vehicle.customerId,
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year?.toString() || '',
      color: vehicle.color || '',
      km: vehicle.km?.toString() || '',
      vin: vehicle.vin || '',
      notes: vehicle.notes || '',
      lastMaintenanceKm: vehicle.lastMaintenanceKm?.toString() || '',
      lastMaintenanceDate: vehicle.lastMaintenanceDate ? vehicle.lastMaintenanceDate.split('T')[0] : '',
      maintenanceIntervalKm: vehicle.maintenanceIntervalKm?.toString() || '',
      maintenanceIntervalDays: vehicle.maintenanceIntervalDays?.toString() || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este veículo?')) {
      try {
        await vehiclesApi.delete(id);
        loadData();
      } catch (error) {
        console.error('Falha ao excluir veículo:', error);
      }
    }
  };

  const resetForm = () => {
    setEditingVehicle(null);
    setFormData({
      customerId: '',
      plate: '',
      brand: '',
      model: '',
      year: '',
      color: '',
      km: '',
      vin: '',
      notes: '',
      lastMaintenanceKm: '',
      lastMaintenanceDate: '',
      maintenanceIntervalKm: '',
      maintenanceIntervalDays: '',
    });
  };

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Veículos</h1>
          <p className="text-slate-500 font-medium">{vehicles.length} veículos cadastrados na frota</p>
        </div>
        {vehicles.filter(isMaintenanceDue).length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl text-orange-700 text-sm font-semibold">
            <Bell className="w-4 h-4" />
            {vehicles.filter(isMaintenanceDue).length} veículo(s) com manutenção vencida
          </div>
        )}
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Novo Veículo
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4 bg-slate-50/50">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por placa, marca ou modelo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-slate-900" />
            <p className="text-slate-500 font-medium animate-pulse">Carregando frota de veículos...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Placa</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Veículo</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Proprietário</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Ano / KM</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((vehicle) => (
                  <tr key={vehicle.id} className="group hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-slate-900 text-white font-mono font-bold text-sm shadow-sm">
                        {vehicle.plate}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div>
                        <p className="font-bold text-slate-900">
                          {vehicle.brand} {vehicle.model}
                        </p>
                        <p className="text-xs text-slate-500">{vehicle.color || 'Cor não informada'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-bold">
                          {vehicle.customer?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-slate-700">
                          {vehicle.customer?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm text-slate-700 font-medium">{vehicle.year || '-'}</div>
                          <div className="text-xs text-slate-500">{vehicle.km?.toLocaleString('pt-BR')} km</div>
                        </div>
                        {isMaintenanceDue(vehicle) && (
                          <span title="Manutenção vencida" className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-600 rounded-lg text-xs font-bold">
                            <Wrench className="w-3 h-3" /> Vencida
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(vehicle.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredVehicles.length === 0 && (
              <div className="text-center py-20">
                <Car className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                <h3 className="text-lg font-bold text-slate-900">Nenhum veículo encontrado</h3>
                <p className="text-slate-500">Tente buscar por outra placa ou modelo.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingVehicle ? 'Editar Veículo' : 'Novo Veículo'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Proprietário (Cliente) *</label>
                  <select
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData({ ...formData, customerId: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    required
                  >
                    <option value="">Selecione um cliente...</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Placa *</label>
                    <input
                      type="text"
                      value={formData.plate}
                      onChange={(e) =>
                        setFormData({ ...formData, plate: formatPlate(e.target.value) })
                      }
                      placeholder="ABC-1234"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm font-mono font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Ano</label>
                    <input
                      type="number"
                      value={formData.year}
                      onChange={(e) =>
                        setFormData({ ...formData, year: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Marca *</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) =>
                        setFormData({ ...formData, brand: e.target.value })
                      }
                      placeholder="Ex: Toyota"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Modelo *</label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      placeholder="Ex: Corolla"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Cor</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">KM Atual</label>
                    <input
                      type="number"
                      value={formData.km}
                      onChange={(e) =>
                        setFormData({ ...formData, km: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                    />
                  </div>
                </div>

                {/* Manutenção Preventiva */}
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> Manutenção Preventiva
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">KM na Última Revisão</label>
                      <input
                        type="number"
                        value={formData.lastMaintenanceKm}
                        onChange={(e) => setFormData({ ...formData, lastMaintenanceKm: e.target.value })}
                        placeholder="Ex: 45000"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Data da Última Revisão</label>
                      <input
                        type="date"
                        value={formData.lastMaintenanceDate}
                        onChange={(e) => setFormData({ ...formData, lastMaintenanceDate: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Intervalo (km)</label>
                      <input
                        type="number"
                        value={formData.maintenanceIntervalKm}
                        onChange={(e) => setFormData({ ...formData, maintenanceIntervalKm: e.target.value })}
                        placeholder="Ex: 10000"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Intervalo (dias)</label>
                      <input
                        type="number"
                        value={formData.maintenanceIntervalDays}
                        onChange={(e) => setFormData({ ...formData, maintenanceIntervalDays: e.target.value })}
                        placeholder="Ex: 180"
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95">
                    {editingVehicle ? 'Salvar Alterações' : 'Cadastrar Veículo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}