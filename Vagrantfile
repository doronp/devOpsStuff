# Defines our Vagrant environment
#
# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|

  # create load balancer
  # config.vm.define :lb do |lb_config|
  #     lb_config.vm.box = "ubuntu/trusty64"
  #     lb_config.vm.hostname = "lb"
  #     lb_config.vm.network :private_network, ip: "10.0.15.11"
  #     lb_config.vm.network "forwarded_port", guest: 80, host: 8080
  #     config.vm.box_check_update = false
  #     lb_config.vm.provider "virtualbox" do |vb|
  #       vb.memory = "512"
  #     end
  # end

  
  (1..2).each do |i|
    config.vm.define "swarmManager#{i}" do |node|
        node.vm.box = "ubuntu/trusty64"
        node.vm.hostname = "swarmManager#{i}"
        node.vm.network :private_network, ip: "10.0.15.3#{i}"
        node.vm.network "forwarded_port", guest: 2376, host: "808#{i}"
        config.vm.box_check_update = false
        node.vm.provider "virtualbox" do |vb|
          vb.memory = "512"
        end
    end
  end

  # create consul
  config.vm.define :consul do |consul_config|
      consul_config.vm.box = "ubuntu/trusty64"
      consul_config.vm.hostname = "consul"
      consul_config.vm.network :private_network, ip: "10.0.15.41"
      consul_config.vm.network "forwarded_port", guest: 2380, host: 2380
      consul_config.vm.network "forwarded_port", guest: 4001, host: 4001
      config.vm.box_check_update = false
      consul_config.vm.provider "virtualbox" do |vb|
        vb.memory = "512"
      end
  end

  # create some docker servers
  (1..2).each do |i|
    config.vm.define "docker#{i}" do |node|
        node.vm.box = "ubuntu/trusty64"
        node.vm.hostname = "docker#{i}"
        node.vm.network :private_network, ip: "10.0.15.2#{i}"
        node.vm.network "forwarded_port", guest: 2375, host: "807#{i}"
        config.vm.box_check_update = false
        node.vm.provider "virtualbox" do |vb|
          vb.memory = "512"
        end
    end
  end

  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "playbooks/install-docker.yml"
  end

  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "playbooks/install-consul.yml"
  end

  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "playbooks/setupSwarm.yml"
  end

  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "playbooks/setUpSwarmReplica.yml"
  end

  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "playbooks/joinNodeToSwarm.yml"
  end

end
