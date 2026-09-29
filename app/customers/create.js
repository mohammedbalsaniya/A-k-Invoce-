import CustomerForm from '../../components/CustomerForm';
import { useCustomerStore } from '../../stores/customerStore';
import { useRouter } from 'expo-router';

export default function CreateCustomer() {
  const { addCustomer, loading } = useCustomerStore();
  const router = useRouter();

  const onSubmit = async (data) => {
    await addCustomer(data);
    router.back();
  };

  return <CustomerForm onSubmit={onSubmit} loading={loading} title="Add New Customer" />;
}
