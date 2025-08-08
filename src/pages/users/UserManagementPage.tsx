import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { useERPAuth, ERPUser, ERPModule, CreateUserData } from '@/contexts/ERPAuthContext';
import { toast } from 'sonner';

const UserManagementPage = () => {
  const { 
    currentUser,
    hasManagerAccess,
    getAllUsers,
    getAllModules,
    createUser,
    updateUser,
    deleteUser,
    grantModuleAccess,
    revokeModuleAccess,
    refreshUserData
  } = useERPAuth();

  const [users, setUsers] = useState<ERPUser[]>([]);
  const [modules, setModules] = useState<ERPModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ERPUser | null>(null);
  const [userPermissions, setUserPermissions] = useState<{ [key: string]: boolean }>({});

  // Form states
  const [createForm, setCreateForm] = useState<CreateUserData>({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'employee'
  });
  const [editForm, setEditForm] = useState<Partial<CreateUserData>>({});
  const [showPassword, setShowPassword] = useState(false);

  // Check if user has manager access
  if (!hasManagerAccess()) {
    return (
      <Layout>
        <div className="container mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You don't have permission to access User Management. This section is only available to managers.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, modulesData] = await Promise.all([
        getAllUsers(),
        getAllModules()
      ]);
      setUsers(usersData);
      setModules(modulesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load user management data');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset forms
  const resetCreateForm = () => {
    setCreateForm({
      username: '',
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'employee'
    });
  };

  const resetEditForm = () => {
    setEditForm({});
    setSelectedUser(null);
  };

  // Handle create user
  const handleCreateUser = async () => {
    try {
      // Check if username already exists
      const existingUser = users.find(user => user.username.toLowerCase() === createForm.username.toLowerCase());
      if (existingUser) {
        toast.error('Username already exists. Please choose a different username.');
        return;
      }

      // Check if email already exists
      const existingEmail = users.find(user => user.email.toLowerCase() === createForm.email.toLowerCase());
      if (existingEmail) {
        toast.error('Email already exists. Please use a different email address.');
        return;
      }

      const result = await createUser(createForm);
      if (result.success) {
        setShowCreateDialog(false);
        resetCreateForm();
        await loadData();
        toast.success('User created successfully');
      } else {
        // Handle specific database constraint errors
        if (result.error?.includes('username_key')) {
          toast.error('Username already exists. Please choose a different username.');
        } else if (result.error?.includes('email_key')) {
          toast.error('Email already exists. Please use a different email address.');
        } else {
          toast.error(result.error || 'Failed to create user');
        }
      }
    } catch (error) {
      console.error('Create user error:', error);
      const errorMessage = (error as any)?.message || 'Failed to create user';
      if (errorMessage.includes('username_key')) {
        toast.error('Username already exists. Please choose a different username.');
      } else if (errorMessage.includes('email_key')) {
        toast.error('Email already exists. Please use a different email address.');
      } else {
        toast.error('Failed to create user');
      }
    }
  };

  // Handle edit user
  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      const result = await updateUser(selectedUser.id, editForm);
      if (result.success) {
        setShowEditDialog(false);
        resetEditForm();
        await loadData();
      } else {
        toast.error(result.error || 'Failed to update user');
      }
    } catch (error) {
      console.error('Update user error:', error);
      toast.error('Failed to update user');
    }
  };

  // Handle delete user
  const handleDeleteUser = async (user: ERPUser) => {
    if (user.id === currentUser?.id) {
      toast.error("You cannot delete your own account");
      return;
    }

    if (window.confirm(`Are you sure you want to deactivate ${user.first_name} ${user.last_name}?`)) {
      try {
        const result = await deleteUser(user.id);
        if (result.success) {
          await loadData();
        } else {
          toast.error(result.error || 'Failed to deactivate user');
        }
      } catch (error) {
        console.error('Delete user error:', error);
        toast.error('Failed to deactivate user');
      }
    }
  };

  // Open permissions dialog
  const openPermissionsDialog = async (user: ERPUser) => {
    setSelectedUser(user);
    setShowPermissionsDialog(true);
    
    // Load user's current permissions
    // For now, we'll use a simple approach - you could fetch specific user permissions
    const permissions: { [key: string]: boolean } = {};
    modules.forEach(module => {
      permissions[module.module_key] = user.role === 'manager'; // Managers have all permissions by default
    });
    setUserPermissions(permissions);
  };

  // Handle permission change
  const handlePermissionChange = async (moduleKey: string, hasAccess: boolean) => {
    if (!selectedUser) return;

    try {
      let result;
      if (hasAccess) {
        result = await grantModuleAccess(selectedUser.id, moduleKey);
      } else {
        result = await revokeModuleAccess(selectedUser.id, moduleKey);
      }

      if (result.success) {
        setUserPermissions(prev => ({
          ...prev,
          [moduleKey]: hasAccess
        }));
        await refreshUserData();
      } else {
        toast.error(result.error || 'Failed to update permissions');
      }
    } catch (error) {
      console.error('Permission change error:', error);
      toast.error('Failed to update permissions');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading user management...</div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-muted-foreground">
                Manage users and their module permissions
              </p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={createForm.first_name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={createForm.last_name}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={createForm.username}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Email address"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={createForm.password}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select 
                      value={createForm.role} 
                      onValueChange={(value: 'manager' | 'employee') => setCreateForm(prev => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser}>
                      Create User
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Users ({users.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.first_name} {user.last_name}
                      </TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'manager' ? 'default' : 'secondary'}>
                          {user.role === 'manager' ? 'Manager' : 'Employee'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setEditForm({
                                username: user.username,
                                email: user.email,
                                first_name: user.first_name,
                                last_name: user.last_name,
                                role: user.role
                              });
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openPermissionsDialog(user)}
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">First Name</Label>
                    <Input
                      id="editFirstName"
                      value={editForm.first_name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Last Name</Label>
                    <Input
                      id="editLastName"
                      value={editForm.last_name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editUsername">Username</Label>
                  <Input
                    id="editUsername"
                    value={editForm.username || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Email</Label>
                  <Input
                    id="editEmail"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email address"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editPassword">New Password (optional)</Label>
                  <Input
                    id="editPassword"
                    type="password"
                    value={editForm.password || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Leave empty to keep current password"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editRole">Role</Label>
                  <Select 
                    value={editForm.role || 'employee'} 
                    onValueChange={(value: 'manager' | 'employee') => setEditForm(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditUser}>
                    Update User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Permissions Dialog */}
          <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  Module Permissions - {selectedUser?.first_name} {selectedUser?.last_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selectedUser?.role === 'manager' && (
                  <Alert>
                    <Shield className="h-4 w-4" />
                    <AlertDescription>
                      Managers have access to all modules by default.
                    </AlertDescription>
                  </Alert>
                )}
                
                {modules.map((module) => (
                  <div key={module.id} className="flex items-center justify-between">
                    <div>
                      <Label htmlFor={`module-${module.module_key}`} className="text-sm font-medium">
                        {module.module_name}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {module.description}
                      </p>
                    </div>
                    <Switch
                      id={`module-${module.module_key}`}
                      checked={userPermissions[module.module_key] || false}
                      onCheckedChange={(checked) => handlePermissionChange(module.module_key, checked)}
                      disabled={selectedUser?.role === 'manager'}
                    />
                  </div>
                ))}
                
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setShowPermissionsDialog(false)}>
                    Done
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Layout>
  );
};

export default UserManagementPage;
